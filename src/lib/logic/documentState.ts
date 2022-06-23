import {
  compileJSONPointer,
  existsIn,
  getIn,
  immutableJSONPatch,
  parseJSONPointer
} from 'immutable-json-patch'
import { initial, isEqual, last } from 'lodash-es'
import { DEFAULT_VISIBLE_SECTIONS } from '../constants.js'
import { forEachIndex } from '../utils/arrayUtils.js'
import { parseJSONPointerWithArrayIndices, pointerStartsWith } from '../utils/jsonPointer.js'
import { isObjectOrArray, isStringContainingPrimitiveValue } from '../utils/typeUtils.js'
import {
  currentRoundNumber,
  inVisibleSection,
  mergeSections,
  nextRoundNumber
} from './expandItemsSections.js'
import type {
  CaretPosition,
  DocumentState,
  JSONArray,
  JSONData,
  JSONObject,
  JSONPatchAdd,
  JSONPatchCopy,
  JSONPatchDocument,
  JSONPatchMove,
  JSONPatchRemove,
  JSONPatchReplace,
  JSONPointer,
  Path,
  PathsMap,
  Section,
  Selection,
  VisibleSection
} from '../types'
import { traverse } from '../utils/objectUtils.js'
import { CaretType } from '../types.js'
import { isJSONArray, isJSONObject } from '../utils/jsonUtils.js'
import {
  isJSONPatchAdd,
  isJSONPatchCopy,
  isJSONPatchMove,
  isJSONPatchRemove,
  isJSONPatchReplace
} from '../typeguards.js'
import { createSelectionFromOperations, updateSelectionInDocumentState } from './selection.js'

type CreateSelection = (json: JSONData, documentState: DocumentState) => Selection

export type CreateDocumentStateProps = {
  json: JSONData
  expand?: (path: Path) => boolean
  select?: CreateSelection
}

// TODO: write unit tests
export function createDocumentState(props?: CreateDocumentStateProps): DocumentState {
  let documentState = {
    expandedMap: {},
    enforceStringMap: {},
    keysMap: {},
    visibleSectionsMap: {},
    selection: undefined,
    selectionMap: {},
    searchResult: undefined,
    validationErrors: [],
    validationErrorsMap: {}
  }

  if (props?.select) {
    documentState = {
      ...documentState,
      selection: props.select(props.json, documentState)
    }
  }

  if (props?.expand) {
    documentState = expandWithCallback(props.json, documentState, [], props.expand)
  }

  return documentState
}

export function getVisibleSections(
  documentState: DocumentState,
  pointer: JSONPointer
): VisibleSection[] {
  return documentState.visibleSectionsMap[pointer] || DEFAULT_VISIBLE_SECTIONS
}

/**
 * Invoke a callback function for every visible item in the array
 */
export function forEachVisibleIndex(
  jsonArray: JSONArray,
  visibleSections: VisibleSection[],
  callback: (index: number) => void
) {
  visibleSections.forEach(({ start, end }) => {
    forEachIndex(start, Math.min(jsonArray.length, end), callback)
  })
}

/**
 * Expand all nodes on given path
 */
export function expandPath(
  json: JSONData,
  documentState: DocumentState,
  path: Path
): DocumentState {
  const expanded: PathsMap<boolean> = { ...documentState.expandedMap }
  const visibleSections = { ...documentState.visibleSectionsMap }

  for (let i = 0; i <= path.length; i++) {
    const partialPath = path.slice(0, i)
    const partialPointer = compileJSONPointer(partialPath)

    const value = getIn(json, partialPath)

    if (isObjectOrArray(value)) {
      expanded[partialPointer] = true
    }

    // if needed, enlarge the expanded sections such that the search result becomes visible in the array
    if (Array.isArray(value) && i < path.length) {
      const sections = visibleSections[partialPointer] || DEFAULT_VISIBLE_SECTIONS
      const index = path[i] as number

      if (!inVisibleSection(sections, index)) {
        const start = currentRoundNumber(index)
        const end = nextRoundNumber(start)
        const newSection = { start, end }
        visibleSections[partialPointer] = mergeSections(sections.concat(newSection))
      }
    }
  }

  return {
    ...documentState,
    expandedMap: expanded,
    visibleSectionsMap: visibleSections
  }
}

/**
 * Expand a node, end expand its children according to the provided callback
 * Nodes that are already expanded will be left untouched
 */
export function expandWithCallback(
  json: JSONData,
  state: DocumentState,
  path: Path,
  expandedCallback: (path: Path) => boolean
): DocumentState {
  const expandedMap = { ...state.expandedMap }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const contents: JSONData = getIn(json, path)
  traverse(contents, (value, relativePath) => {
    const nestedPath = path.concat(relativePath)

    if (isObjectOrArray(value) && expandedCallback(nestedPath)) {
      expandedMap[compileJSONPointer(nestedPath)] = true
    } else {
      // do not iterate over the children of this object or array
      return false
    }
  })

  return {
    ...state,
    expandedMap
  }
}

// TODO: write unit tests
export function expandSingleItem(state: DocumentState, path: Path): DocumentState {
  return {
    ...state,
    expandedMap: {
      ...state.expandedMap,
      [compileJSONPointer(path)]: true
    }
  }
}

// TODO: write unit tests
export function collapsePath(documentState: DocumentState, path: Path): DocumentState {
  // delete the expanded state of the path and all it's nested paths
  const [expandedMap] = deletePath(documentState.expandedMap, path)
  const [enforceStringMap] = deletePath(documentState.enforceStringMap, path)
  const [keysMap] = deletePath(documentState.keysMap, path)
  const [visibleSectionsMap] = deletePath(documentState.visibleSectionsMap, path)

  return {
    ...documentState,
    expandedMap,
    enforceStringMap,
    keysMap,
    visibleSectionsMap
  }
}

// TODO: write unit tests
export function setEnforceString(
  state: DocumentState,
  pointer: JSONPointer,
  enforceString: boolean
): DocumentState {
  if (enforceString) {
    const updatedEnforceString = { ...state.enforceStringMap }
    updatedEnforceString[pointer] = enforceString

    return {
      ...state,
      enforceStringMap: updatedEnforceString
    }
  } else {
    // remove if defined
    if (typeof state.enforceStringMap[pointer] === 'boolean') {
      const updatedEnforceString = { ...state.enforceStringMap }
      delete updatedEnforceString[pointer]
      return {
        ...state,
        enforceStringMap: updatedEnforceString
      }
    } else {
      return state
    }
  }
}

/**
 * Expand a section of items in an array
 */
export function expandSection(
  json: JSONData,
  state: DocumentState,
  pointer: JSONPointer,
  section: Section
): DocumentState {
  return {
    ...state,
    visibleSectionsMap: {
      ...state.visibleSectionsMap,
      [pointer]: mergeSections(getVisibleSections(state, pointer).concat(section))
    }
  }
}

export function syncKeys(actualKeys: string[], prevKeys?: string[]): string[] {
  if (!prevKeys) {
    return actualKeys
  }

  // copy the keys that still exist
  const actualKeysSet = new Set(actualKeys)
  const keys = prevKeys.filter((key) => actualKeysSet.has(key))

  // add new keys
  const keysSet = new Set(keys)
  actualKeys.filter((key) => !keysSet.has(key)).forEach((key) => keys.push(key))

  return keys
}

/**
 * Apply patch operations to both json and state
 */
export function documentStatePatch(
  json: JSONData,
  documentState: DocumentState,
  operations: JSONPatchDocument
): { json: JSONData; documentState: DocumentState } {
  const updatedJson = immutableJSONPatch(json, operations) as JSONData

  const updatedDocumentState = operations.reduce((updatingState, operation) => {
    if (isJSONPatchAdd(operation)) {
      return documentStateAdd(updatedJson, updatingState, operation)
    }

    if (isJSONPatchRemove(operation)) {
      return documentStateRemove(updatedJson, updatingState, operation)
    }

    if (isJSONPatchReplace(operation)) {
      return documentStateReplace(updatedJson, updatingState, operation)
    }
    if (isJSONPatchCopy(operation)) {
      return documentStateCopy(updatedJson, updatingState, operation)
    }

    if (isJSONPatchMove(operation)) {
      return documentStateMove(updatedJson, updatingState, operation)
    }

    return updatingState
  }, documentState)

  return {
    json: updatedJson,
    documentState: updatedDocumentState
  }
}

export function documentStateAdd(
  json: JSONData,
  documentState: DocumentState,
  operation: JSONPatchAdd
): DocumentState {
  const path = parseJSONPointerWithArrayIndices(json, operation.path)
  const parentPath = initial(path)
  const parentPointer = compileJSONPointer(parentPath)
  const parent = getIn(json, parentPath)

  // FIXME: expand the newly inserted value

  if (isJSONArray(parent)) {
    const index = last(path) as number

    // shift all paths of the relevant parts of the state
    const expanded = shiftPath(documentState.expandedMap, parentPath, index, 1)
    const enforceString = shiftPath(documentState.enforceStringMap, parentPath, index, 1)
    const keys = shiftPath(documentState.keysMap, parentPath, index, 1)
    let visibleSections = shiftPath(documentState.visibleSectionsMap, parentPath, index, 1)

    // shift visible sections of array
    visibleSections = updateInPathsMap(visibleSections, parentPointer, (sections) =>
      shiftVisibleSections(sections, index, 1)
    )

    return {
      ...documentState,
      expandedMap: expanded,
      enforceStringMap: enforceString,
      keysMap: keys,
      visibleSectionsMap: visibleSections
    }
  }

  if (isJSONObject(parent)) {
    // an object, or root
    const key = last(path) as string

    // add the key to the list with keys if needed
    const keys = addKey(documentState.keysMap, parentPointer, key)

    return {
      ...documentState,
      keysMap: keys
    }
  }

  throw new Error('Cannot apply add operation to state')
}

export function documentStateRemove(
  updatedJson: JSONData,
  documentState: DocumentState,
  operation: JSONPatchRemove
): DocumentState {
  const path = parseJSONPointerWithArrayIndices(updatedJson, operation.path)
  const parentPath = initial(path)
  const parentPointer = compileJSONPointer(parentPath)
  const parent = getIn(updatedJson, parentPath)

  let { expandedMap, enforceStringMap, visibleSectionsMap, keysMap } = documentState

  // delete the path itself and its children
  expandedMap = deletePath(expandedMap, path)[0]
  enforceStringMap = deletePath(enforceStringMap, path)[0]
  visibleSectionsMap = deletePath(visibleSectionsMap, path)[0]
  keysMap = deletePath(keysMap, path)[0]

  if (isJSONArray(parent)) {
    const index = last(path) as number

    // shift all paths of the relevant parts of the state
    expandedMap = shiftPath(expandedMap, parentPath, index, -1)
    enforceStringMap = shiftPath(enforceStringMap, parentPath, index, -1)
    keysMap = shiftPath(keysMap, parentPath, index, -1)
    visibleSectionsMap = shiftPath(visibleSectionsMap, parentPath, index, -1)

    // shift visible sections of array
    visibleSectionsMap = updateInPathsMap(visibleSectionsMap, parentPointer, (sections) =>
      shiftVisibleSections(sections, index, -1)
    )
  }

  if (isJSONObject(parent)) {
    // in case of an object property, remove the key
    const key = last(path) as string
    keysMap = removeKey(keysMap, parentPointer, key)
  }

  return {
    ...documentState,
    expandedMap,
    enforceStringMap,
    keysMap,
    visibleSectionsMap
  }
}

export function documentStateReplace(
  updatedJson: JSONData,
  documentState: DocumentState,
  operation: JSONPatchReplace
): DocumentState {
  // FIXME: simplify this function
  const path = parseJSONPointerWithArrayIndices(updatedJson, operation.path)
  const pointer = operation.path
  const value = getIn(updatedJson, path)

  // cleanup state from paths that are removed now
  let keysMap = cleanupNonExistingPaths(updatedJson, documentState.keysMap)
  const expandedMap = cleanupNonExistingPaths(updatedJson, documentState.expandedMap)
  const enforceStringMap = cleanupNonExistingPaths(updatedJson, documentState.enforceStringMap)
  const visibleSectionsMap = cleanupNonExistingPaths(updatedJson, documentState.visibleSectionsMap)

  // cleanup props of the object/array/value itself that are not applicable anymore
  if (!isJSONObject(operation.value) && !isJSONArray(operation.value)) {
    delete expandedMap[pointer]
  }
  if (!isJSONObject(operation.value)) {
    delete keysMap[pointer]
  }
  if (!isJSONArray(operation.value)) {
    delete visibleSectionsMap[pointer]
  }
  if (isJSONObject(operation.value) || isJSONArray(operation.value)) {
    delete enforceStringMap[pointer]
  }

  // update keys: remove old keys, and append new keys
  if (isJSONObject(operation.value)) {
    keysMap = updateKeys(keysMap, pointer, (prevKeys) => syncKeys(Object.keys(value), prevKeys))
  }

  return {
    ...documentState,
    expandedMap,
    enforceStringMap,
    keysMap,
    visibleSectionsMap
  }
}

export function documentStateCopy(
  updatedJson: JSONData,
  documentState: DocumentState,
  operation: JSONPatchCopy
): DocumentState {
  // FIXME: simplify this function

  // get a copy of the state that we will duplicate
  const expandedMapCopy = filterPath(documentState.expandedMap, operation.from)
  const enforceStringMapCopy = filterPath(documentState.enforceStringMap, operation.from)
  const visibleSectionsMapCopy = filterPath(documentState.visibleSectionsMap, operation.from)
  const keysMapCopy = filterPath(documentState.keysMap, operation.from)

  let { expandedMap, enforceStringMap, visibleSectionsMap, keysMap } = documentStateAdd(
    updatedJson,
    documentState,
    {
      op: 'add',
      path: operation.path,
      value: undefined // just a fake value, we will not use this
    }
  )

  const renamePointer = (pointer) => {
    return operation.path + pointer.substring(operation.from.length)
  }

  // move and merge the copied state
  expandedMap = mergePaths(expandedMap, movePath(expandedMapCopy, renamePointer))
  enforceStringMap = mergePaths(enforceStringMap, movePath(enforceStringMapCopy, renamePointer))
  visibleSectionsMap = mergePaths(
    visibleSectionsMap,
    movePath(visibleSectionsMapCopy, renamePointer)
  )
  keysMap = mergePaths(keysMap, movePath(keysMapCopy, renamePointer))

  return {
    ...documentState,
    expandedMap,
    enforceStringMap,
    keysMap,
    visibleSectionsMap
  }
}

export function documentStateMove(
  updatedJson: JSONData,
  documentState: DocumentState,
  operation: JSONPatchMove
): DocumentState {
  // FIXME: simplify this function
  if (operation.from === operation.path) {
    const path = parseJSONPointerWithArrayIndices(updatedJson, operation.path)
    const parentPath = initial(path)
    const toParent = getIn(updatedJson, parentPath)

    if (isJSONObject(toParent)) {
      // if an object key, move the key to the end of the keys
      const parentPointer = compileJSONPointer(parentPath)
      const key = last(path) as string

      return {
        ...documentState,
        keysMap: updateKeys(documentState.keysMap, parentPointer, (keys) => {
          return keys.filter((k) => k !== key).concat([key])
        })
      }
    }

    // in case of an array item, we don't have to do anything
    return documentState
  }

  // get a copy of the state that we will duplicate
  const expandedMapCopy = filterPath(documentState.expandedMap, operation.from)
  const enforceStringMapCopy = filterPath(documentState.enforceStringMap, operation.from)
  const visibleSectionsMapCopy = filterPath(documentState.visibleSectionsMap, operation.from)
  const keysMapCopy = filterPath(documentState.keysMap, operation.from)

  const updatedDocumentState1 = documentStateRemove(updatedJson, documentState, {
    op: 'remove',
    path: operation.from
  })

  let { expandedMap, enforceStringMap, visibleSectionsMap, keysMap } = documentStateAdd(
    updatedJson,
    updatedDocumentState1,
    {
      op: 'add',
      path: operation.path,
      value: undefined // just a fake value, we will not use this
    }
  )

  const renamePointer = (pointer) => {
    return operation.path + pointer.substring(operation.from.length)
  }

  // move and merge the copied state
  expandedMap = mergePaths(expandedMap, movePath(expandedMapCopy, renamePointer))
  enforceStringMap = mergePaths(enforceStringMap, movePath(enforceStringMapCopy, renamePointer))
  visibleSectionsMap = mergePaths(
    visibleSectionsMap,
    movePath(visibleSectionsMapCopy, renamePointer)
  )
  keysMap = mergePaths(keysMap, movePath(keysMapCopy, renamePointer))

  return {
    ...documentState,
    expandedMap,
    enforceStringMap,
    keysMap,
    visibleSectionsMap
  }
}

/**
 * Delete a path from a PathsMap. Will delete the path and its child paths
 * IMPORTANT: will NOT shift array items when an array item is removed, use shiftPath for that
 */
export function deletePath<T>(
  map: PathsMap<T>,
  path: Path
): [updatedMap: PathsMap<T>, deletedMap: PathsMap<T>] {
  const updatedMap: PathsMap<T> = {}
  const deletedMap: PathsMap<T> = {}
  const pointer = compileJSONPointer(path)

  // partition the contents of the map
  Object.keys(map).forEach((itemPointer) => {
    if (!pointerStartsWith(itemPointer, pointer)) {
      updatedMap[itemPointer] = map[itemPointer]
    } else {
      deletedMap[itemPointer] = map[itemPointer]
    }
  })

  return [updatedMap, deletedMap]
}

// TODO: unit test
export function filterPath<T>(map: PathsMap<T>, pointer: JSONPointer): PathsMap<T> {
  const filteredMap: PathsMap<T> = {}

  Object.keys(map).forEach((itemPointer) => {
    if (pointerStartsWith(itemPointer, pointer)) {
      filteredMap[itemPointer] = map[itemPointer]
    }
  })

  return filteredMap
}

// TODO: unit test
export function mergePaths<T>(a: PathsMap<T>, b: PathsMap<T>): PathsMap<T> {
  return { ...a, ...b }
}

// TODO: unit test
export function movePath<T>(
  map: PathsMap<T>,
  changePointer: (pointer: JSONPointer) => JSONPointer
): PathsMap<T> {
  const movedMap: PathsMap<T> = {}

  Object.keys(map).forEach((oldPointer) => {
    const newPointer = changePointer(oldPointer)
    movedMap[newPointer] = map[oldPointer]
  })

  return movedMap
}

export function shiftPath<T>(
  map: PathsMap<T>,
  path: Path,
  index: number,
  offset: number
): PathsMap<T> {
  const indexPathPos = path.length
  const pointer = compileJSONPointer(path)

  // collect all paths that need to be shifted, with their old path, new path, and value
  const matches: { oldPointer: JSONPointer; newPointer: JSONPointer; value: T }[] = []
  for (const itemPointer of Object.keys(map)) {
    if (pointerStartsWith(itemPointer, pointer)) {
      const itemPath = parseJSONPointer(itemPointer)
      const pathIndex = parseInt(itemPath[indexPathPos] as string, 10)

      if (pathIndex >= index) {
        itemPath[indexPathPos] = pathIndex + offset

        matches.push({
          oldPointer: itemPointer,
          newPointer: compileJSONPointer(itemPath),
          value: map[itemPointer]
        })
      }
    }
  }

  // if there are no changes, just return the original map
  if (matches.length === 0) {
    return map
  }

  const updatedMap = { ...map }

  // delete all old paths from the map
  // we do this *before* inserting new paths to prevent deleting a math that is already moved
  matches.forEach((match) => {
    delete updatedMap[match.oldPointer]
  })

  // insert shifted paths in the map
  matches.forEach((match) => {
    updatedMap[match.newPointer] = match.value
  })

  return updatedMap
}

// TODO: unit test
export function addKey(
  keysMap: PathsMap<string[]>,
  parentPointer: JSONPointer,
  key: string
): PathsMap<string[]> {
  return updateKeys(keysMap, parentPointer, (keys) => {
    return !keys.includes(key) ? keys.concat([key]) : keys
  })
}

// TODO: unit test
export function removeKey(
  keysMap: PathsMap<string[]>,
  parentPointer: JSONPointer,
  key: string
): PathsMap<string[]> {
  const updatedKeysMap = updateInPathsMap(keysMap, parentPointer, (keys) =>
    keys.includes(key) ? keys.filter((k) => k !== key) : keys
  )

  return updatedKeysMap !== keysMap ? updatedKeysMap : keysMap
}

// TODO: unit test
export function updateKeys(
  keysMap: PathsMap<string[]>,
  pointer: JSONPointer,
  callback: (keys: string[]) => string[]
): PathsMap<string[]> {
  const updatedKeysMap = updateInPathsMap(keysMap, pointer, callback)

  // we can do a cheap strict equality check here
  return updatedKeysMap !== keysMap ? updatedKeysMap : keysMap
}

// TODO: unit test
export function cleanupNonExistingPaths<T>(json: JSONData, map: PathsMap<T>): PathsMap<T> {
  const updatedMap = {}

  // TODO: for optimization, we could pass a filter callback which allows you to filter paths
  //  starting with a specific, so you don't need to invoke parseJSONPointer and existsIn for largest part

  Object.keys(map)
    .filter((pointer) => existsIn(json, parseJSONPointerWithArrayIndices(json, pointer)))
    .forEach((pointer) => {
      updatedMap[pointer] = map[pointer]
    })

  return updatedMap
}

/**
 * Update a value in a PathsMap.
 * When the path exists, the callback will be invoked.
 * When the path does not exist, the callback is not invoked.
 */
export function updateInPathsMap<T>(
  map: PathsMap<T>,
  pointer: JSONPointer,
  callback: (value: T) => T
) {
  const value = map[pointer]

  if (pointer in map) {
    const updatedValue = callback(value)
    if (!isEqual(value, updatedValue)) {
      const updatedMap = { ...map }

      if (updatedValue === undefined) {
        delete updatedMap[pointer]
      } else {
        updatedMap[pointer] = updatedValue
      }

      return updatedMap
    }
  }

  return map
}

/**
 * Update a value in a PathsMap.
 * When the path exists, the callback will be invoked.
 * When the path does not exist, the callback is not invoked.
 */
// TODO: cleanup transformPathsMap if not needed
export function transformPathsMap<T>(
  map: PathsMap<T>,
  callback: (pointer: JSONPointer, value: T) => T
): PathsMap<T> {
  const transformedMap = {}

  Object.keys(map).forEach((pointer) => {
    transformedMap[pointer] = callback(pointer, map[pointer])
  })

  // TODO: make the function immutable when there are no actual changes

  return transformedMap
}

/**
 * Shift visible sections in an Array with a specified offset
 */
export function shiftVisibleSections(
  visibleSections: VisibleSection[],
  index: number,
  offset: number
): VisibleSection[] {
  return visibleSections.map((section) => {
    return {
      start: section.start > index ? section.start + offset : section.start,
      end: section.end >= index ? section.end + offset : section.end
    }
  })
}

export function getKeys(
  object: JSONObject,
  documentState: DocumentState,
  pointer: JSONPointer
): string[] {
  return documentState.keysMap[pointer] || (object ? Object.keys(object) : [])
}

export function getEnforceString(
  json: JSONData,
  documentState: DocumentState,
  pointer: JSONPointer
): boolean {
  const enforceString = documentState.enforceStringMap[pointer]

  if (typeof enforceString === 'boolean') {
    return enforceString
  }

  return isStringContainingPrimitiveValue(json)
}

export function getNextKeys(keys, key, includeKey = false) {
  const index = keys.indexOf(key)
  if (index !== -1) {
    return includeKey ? keys.slice(index) : keys.slice(index + 1)
  } else {
    // a new key, that doesn't have next keys
    return []
  }
}

/**
 * Get all paths which are visible and rendered
 */
// TODO: create memoized version of getVisiblePaths which remembers just the previous result if json and state are the same
export function getVisiblePaths(json: JSONData, documentState: DocumentState): Path[] {
  const paths: Path[] = []

  function _recurse(value: JSONData, path: Path) {
    paths.push(path)
    const pointer = compileJSONPointer(path)

    if (value && documentState.expandedMap[pointer] === true) {
      if (isJSONArray(value)) {
        const visibleSections = getVisibleSections(documentState, pointer)
        forEachVisibleIndex(value, visibleSections, (index) => {
          _recurse(value[index], path.concat(index))
        })
      }

      if (isJSONObject(value)) {
        getKeys(value, documentState, pointer).forEach((key) => {
          _recurse(value[key], path.concat(key))
        })
      }
    }
  }

  _recurse(json, [])

  return paths
}

/**
 * Get all caret position which are visible and rendered:
 * before a node, at a key, at a value, appending an object/array
 */
// TODO: create memoized version of getVisibleCaretPositions which remembers just the previous result if json and state are the same
export function getVisibleCaretPositions(
  json: JSONData,
  documentState: DocumentState,
  includeInside = true
): CaretPosition[] {
  const paths: CaretPosition[] = []

  function _recurse(value: JSONData, path: Path) {
    paths.push({ path, type: CaretType.value })

    const pointer = compileJSONPointer(path)
    if (value && documentState.expandedMap[pointer] === true) {
      if (includeInside) {
        paths.push({ path, type: CaretType.inside })
      }

      if (isJSONArray(value)) {
        const visibleSections = getVisibleSections(documentState, pointer)
        forEachVisibleIndex(value, visibleSections, (index) => {
          const itemPath = path.concat(index)

          _recurse(value[index], itemPath)

          if (includeInside) {
            paths.push({ path: itemPath, type: CaretType.after })
          }
        })
      }

      if (isJSONObject(value)) {
        const keys = getKeys(value, documentState, pointer)
        keys.forEach((key) => {
          const propertyPath = path.concat(key)

          paths.push({ path: propertyPath, type: CaretType.key })

          _recurse(value[key], propertyPath)

          if (includeInside) {
            paths.push({ path: propertyPath, type: CaretType.after })
          }
        })
      }
    }
  }

  _recurse(json, [])

  return paths
}

/**
 * Find the previous visible path.
 * This can be the last child of the previous object or array, or the parent of a first entry.
 */
// TODO: write tests for getPreviousVisiblePath
export function getPreviousVisiblePath(
  json: JSONData,
  documentState: DocumentState,
  path: Path
): Path | null {
  const visiblePaths = getVisiblePaths(json, documentState)
  const visiblePathPointers = visiblePaths.map(compileJSONPointer)
  const pathPointer = compileJSONPointer(path)
  const index = visiblePathPointers.indexOf(pathPointer)

  if (index !== -1 && index > 0) {
    return visiblePaths[index - 1]
  }

  return null
}

/**
 * Find the next visible path.
 * This can be the next parent entry.
 */
// TODO: write tests for getNextVisiblePath
export function getNextVisiblePath(
  json: JSONData,
  documentState: DocumentState,
  path: Path
): Path | null {
  const visiblePaths = getVisiblePaths(json, documentState)
  const visiblePathPointers = visiblePaths.map(compileJSONPointer)
  const index = visiblePathPointers.indexOf(compileJSONPointer(path))

  if (index !== -1 && index < visiblePaths.length - 1) {
    return visiblePaths[index + 1]
  }

  return null
}
