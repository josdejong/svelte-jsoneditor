import {
  compileJSONPointer,
  deleteIn,
  existsIn,
  getIn,
  immutableJSONPatch,
  isJSONArray,
  isJSONObject,
  isJSONPatchAdd,
  isJSONPatchCopy,
  isJSONPatchMove,
  isJSONPatchRemove,
  isJSONPatchReplace,
  type JSONPatchAdd,
  type JSONPatchCopy,
  type JSONPatchDocument,
  type JSONPatchMove,
  type JSONPatchRemove,
  type JSONPatchReplace,
  type JSONPath,
  type JSONPointer,
  parseJSONPointer,
  parsePath,
  setIn,
  startsWithJSONPointer,
  updateIn
} from 'immutable-json-patch'
import { initial, isEqual, last } from 'lodash-es'
import { DEFAULT_VISIBLE_SECTIONS, MAX_DOCUMENT_SIZE_EXPAND_ALL } from '../constants.js'
import { forEachIndex } from '../utils/arrayUtils.js'
import { isObject, isObjectOrArray, isStringContainingPrimitiveValue } from '../utils/typeUtils.js'
import {
  currentRoundNumber,
  inVisibleSection,
  mergeSections,
  nextRoundNumber
} from './expandItemsSections.js'
import type {
  CaretPosition,
  DocumentState,
  DocumentState2,
  JSONParser,
  JSONPointerMap,
  JSONSelection,
  OnExpand,
  Section,
  VisibleSection
} from '$lib/types'
import { CaretType } from '$lib/types.js'
import { int } from '../utils/numberUtils.js'
import { isLargeContent } from '$lib/utils/jsonUtils.js'

type OnCreateSelection = (json: unknown, documentState: DocumentState) => JSONSelection

export type CreateDocumentStateProps = {
  json: unknown | undefined
  expand?: OnExpand
  select?: OnCreateSelection
}

export function createDocumentState(props?: CreateDocumentStateProps): DocumentState {
  let documentState: DocumentState = {
    expandedMap: {},
    enforceStringMap: {},
    visibleSectionsMap: {},
    selection: null,
    sortedColumn: null
  }

  if (props?.select && props.json !== undefined) {
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

export function createDocumentState2({
  json,
  select,
  expand
}: CreateDocumentStateProps): DocumentState2 {
  let documentState: DocumentState2 = Array.isArray(json)
    ? { type: 'array', expanded: false, visibleSections: null, items: [] }
    : isObject(json)
      ? { type: 'object', expanded: false, properties: {} }
      : { type: 'value' }

  if (select && json !== undefined) {
    // FIXME: handle initial selection
  }

  if (expand) {
    documentState = expandWithCallback2(json, documentState, [], expand)
  }

  return documentState
}

export function getVisibleSections(
  documentState: DocumentState,
  pointer: JSONPointer
): VisibleSection[] {
  return documentState.visibleSectionsMap[pointer] || DEFAULT_VISIBLE_SECTIONS
}

export function getVisibleSections2(
  json: unknown,
  documentState: DocumentState2,
  path: JSONPath
): VisibleSection[] {
  return (
    getIn(documentState, toRecursiveStatePath(json, path).concat('visibleSections')) ||
    DEFAULT_VISIBLE_SECTIONS
  )
}

/**
 * Invoke a callback function for every visible item in the array
 */
export function forEachVisibleIndex(
  jsonArray: Array<unknown>,
  visibleSections: VisibleSection[],
  callback: (index: number) => void
) {
  visibleSections.forEach(({ start, end }) => {
    forEachIndex(start, Math.min(jsonArray.length, end), callback)
  })
}

/**
 * Expand all nodes on given path
 * The end of the path itself is not expanded
 */
export function expandPath(
  json: unknown,
  documentState: DocumentState,
  path: JSONPath
): DocumentState {
  const expandedMap: JSONPointerMap<boolean> = { ...documentState.expandedMap }
  const visibleSectionsMap = { ...documentState.visibleSectionsMap }

  for (let i = 0; i < path.length; i++) {
    const partialPath = path.slice(0, i)
    const partialPointer = compileJSONPointer(partialPath)

    const value = getIn(json, partialPath)

    if (isObjectOrArray(value)) {
      expandedMap[partialPointer] = true
    }

    // if needed, enlarge the expanded sections such that the search result becomes visible in the array
    if (Array.isArray(value) && i < path.length) {
      const sections = visibleSectionsMap[partialPointer] || DEFAULT_VISIBLE_SECTIONS
      const index = int(path[i])

      if (!inVisibleSection(sections, index)) {
        const start = currentRoundNumber(index)
        const end = nextRoundNumber(start)
        const newSection = { start, end }
        visibleSectionsMap[partialPointer] = mergeSections(sections.concat(newSection))
      }
    }
  }

  return {
    ...documentState,
    expandedMap,
    visibleSectionsMap
  }
}

/**
 * Expand a node, end expand its children according to the provided callback
 * Nodes that are already expanded will be left untouched
 */
// FIXME: remove expandWithCallback
export function expandWithCallback(
  json: unknown | undefined,
  documentState: DocumentState,
  path: JSONPath,
  expandedCallback: OnExpand
): DocumentState {
  const expandedMap = { ...documentState.expandedMap }

  function recurse(value: unknown) {
    const pathIndex = currentPath.length

    if (Array.isArray(value)) {
      if (expandedCallback(currentPath)) {
        const pointer = compileJSONPointer(currentPath)
        expandedMap[pointer] = true

        if (value.length > 0) {
          const visibleSections = getVisibleSections(documentState, pointer)

          forEachVisibleIndex(value, visibleSections, (index) => {
            currentPath[pathIndex] = String(index)
            recurse(value[index])
          })

          currentPath.pop()
        }
      }
    } else if (isObject(value)) {
      if (expandedCallback(currentPath)) {
        expandedMap[compileJSONPointer(currentPath)] = true

        const keys = Object.keys(value)
        if (keys.length > 0) {
          for (const key of keys) {
            currentPath[pathIndex] = key
            recurse(value[key])
          }

          currentPath.pop()
        }
      }
    }
  }

  const currentPath = path.slice()
  const value = json !== undefined ? getIn(json, path) : json
  if (value !== undefined) {
    recurse(value)
  }

  return {
    ...documentState,
    expandedMap
  }
}

export function toRecursiveStatePath(json: unknown, path: JSONPath): JSONPath {
  let value = json
  const recursiveStatePath: JSONPath = []

  let i = 0
  while (i < path.length) {
    if (Array.isArray(value)) {
      const index = path[i]
      recursiveStatePath.push('items', index)
      value = value[parseInt(index)]
    } else if (isObject(value)) {
      const key = path[i]
      recursiveStatePath.push('properties', key)
      value = (value as Record<string, unknown>)[key]
    } else {
      throw new Error(`Cannot convert path: Object or Array expected at index ${i}`)
    }

    i++
  }

  return recursiveStatePath
}

/**
 * Expand a node, end expand its children according to the provided callback
 * Nodes that are already expanded will be left untouched
 */
// FIXME: rename expandWithCallback2 to expandWithCallback
export function expandWithCallback2(
  json: unknown | undefined,
  documentState: DocumentState2,
  path: JSONPath,
  expandedCallback: OnExpand
): DocumentState2 {
  let updatedState = documentState

  // FIXME: should (recursively) create new state when it is missing

  function recurse(value: unknown) {
    const pathIndex = currentPath.length
    const pathStateIndex = currentStatePath.length + 1

    if (Array.isArray(value)) {
      if (expandedCallback(currentPath)) {
        updatedState = updateIn(
          updatedState,
          currentStatePath,
          (value: DocumentState2 | undefined) => {
            return value
              ? { ...value, expanded: true }
              : { type: 'array', expanded: true, visibleSections: null, items: [] }
          }
        )

        if (value.length > 0) {
          currentStatePath.push('items')

          const visibleSections = getVisibleSections2(json, documentState, path)

          forEachVisibleIndex(value, visibleSections, (index) => {
            const indexStr = String(index)
            currentPath[pathIndex] = indexStr
            currentStatePath[pathStateIndex] = indexStr

            recurse(value[index])
          })

          currentPath.pop()
          currentPath.pop()
          currentStatePath.pop()
          currentStatePath.pop()
        }
      }
    } else if (isObject(value)) {
      if (expandedCallback(currentPath)) {
        updatedState = updateIn(
          updatedState,
          currentStatePath,
          (value: DocumentState2 | undefined) => {
            return value
              ? { ...value, expanded: true }
              : { type: 'object', expanded: true, properties: {} }
          }
        )

        const keys = Object.keys(value)
        if (keys.length > 0) {
          currentStatePath.push('properties')

          for (const key of keys) {
            currentPath[pathIndex] = key
            currentStatePath[pathStateIndex] = key

            recurse(value[key])
          }

          currentPath.pop()
          currentPath.pop()
          currentStatePath.pop()
          currentStatePath.pop()
        }
      }
    }
  }

  const currentPath = path.slice()
  const currentStatePath = toRecursiveStatePath(json, currentPath)
  const value = json !== undefined ? getIn(json, path) : json
  if (value !== undefined) {
    recurse(value)
  }

  return updatedState
}

// TODO: write unit tests
export function expandSingleItem(documentState: DocumentState, path: JSONPath): DocumentState {
  return {
    ...documentState,
    expandedMap: {
      ...documentState.expandedMap,
      [compileJSONPointer(path)]: true
    }
  }
}

// TODO: write unit tests
export function expandSingleItem2(
  json: unknown,
  documentState: DocumentState2,
  path: JSONPath
): DocumentState2 {
  return updateIn(
    documentState,
    toRecursiveStatePath(json, path),
    (state: DocumentState2 | undefined) => {
      console.log('update in', state, path)
      return state?.type === 'object' || state?.type === 'array'
        ? { ...state, expanded: true }
        : state
    }
  )
}

// TODO: write unit tests
export function collapsePath(documentState: DocumentState, path: JSONPath): DocumentState {
  // delete the expanded state of the path and all it's nested paths
  const expandedMap = deletePath(documentState.expandedMap, path)
  const enforceStringMap = deletePath(documentState.enforceStringMap, path)
  const visibleSectionsMap = deletePath(documentState.visibleSectionsMap, path)

  return {
    ...documentState,
    expandedMap,
    enforceStringMap,
    visibleSectionsMap
  }
}

// TODO: write unit tests
export function collapsePath2(
  json: unknown,
  documentState: DocumentState2,
  path: JSONPath
): DocumentState2 {
  return updateIn(
    documentState,
    toRecursiveStatePath(json, path),
    (state: DocumentState2 | undefined) => {
      if (state?.type === 'object') {
        return {
          ...state,
          expanded: false,
          properties: {} // clear the state of nested objects
        }
      } else if (state?.type === 'array') {
        return {
          ...state,
          expanded: false,
          visibleSections: null,
          items: []
        }
      } else {
        return state
      }
    }
  )
}

// TODO: write unit tests
export function setEnforceString(
  documentState: DocumentState,
  pointer: JSONPointer,
  enforceString: boolean
): DocumentState {
  if (enforceString) {
    const updatedEnforceString = { ...documentState.enforceStringMap }
    updatedEnforceString[pointer] = enforceString

    return {
      ...documentState,
      enforceStringMap: updatedEnforceString
    }
  } else {
    // remove if defined
    if (typeof documentState.enforceStringMap[pointer] === 'boolean') {
      const updatedEnforceString = { ...documentState.enforceStringMap }
      delete updatedEnforceString[pointer]
      return {
        ...documentState,
        enforceStringMap: updatedEnforceString
      }
    } else {
      return documentState
    }
  }
}

/**
 * Expand a section of items in an array
 */
export function expandSection(
  json: unknown,
  documentState: DocumentState,
  pointer: JSONPointer,
  section: Section
): DocumentState {
  return {
    ...documentState,
    visibleSectionsMap: {
      ...documentState.visibleSectionsMap,
      [pointer]: mergeSections(getVisibleSections(documentState, pointer).concat(section))
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
export function documentStatePatch2(
  json: unknown,
  documentState: DocumentState2,
  operations: JSONPatchDocument
): { json: unknown; documentState: DocumentState2 } {
  const updatedJson: unknown = immutableJSONPatch(json, operations)

  const updatedDocumentState = operations.reduce((updatingState, operation) => {
    if (isJSONPatchAdd(operation)) {
      return documentStateAdd2(updatedJson, updatingState, operation, undefined)
    }

    if (isJSONPatchRemove(operation)) {
      return documentStateRemove2(updatedJson, updatingState, operation)
    }

    if (isJSONPatchReplace(operation)) {
      return documentStateReplace2(updatedJson, updatingState, operation)
    }

    if (isJSONPatchCopy(operation) || isJSONPatchMove(operation)) {
      return documentStateMoveOrCopy2(updatedJson, updatingState, operation)
    }

    return updatingState
  }, documentState)

  return {
    json: updatedJson,
    documentState: updatedDocumentState
  }
}

function updateInDocumentState(
  json: unknown,
  documentState: DocumentState2,
  path: JSONPath,
  transform: (value: DocumentState2 | undefined) => DocumentState2 | undefined
) {
  return updateIn(documentState, toRecursiveStatePath(json, path), transform)
}

export function documentStateAdd2(
  updatedJson: unknown,
  documentState: DocumentState2,
  operation: JSONPatchAdd,
  stateValue: DocumentState2 | undefined
): DocumentState2 {
  const path = parsePath(updatedJson, operation.path)
  const parentPath = initial(path)
  const parent = getIn(updatedJson, parentPath)

  let updatedState = documentState

  if (Array.isArray(parent)) {
    updatedState = updateInDocumentState(
      updatedJson,
      updatedState,
      parentPath,
      (arrayState: DocumentState2 | undefined) => {
        if (arrayState?.type !== 'array') {
          return arrayState
        }

        const index = int(last(path) as string)
        const { items, visibleSections } = arrayState
        return {
          ...arrayState,
          items:
            index < items.length
              ? items
                  .slice(0, index)
                  // eslint-disable-next-line no-sparse-arrays
                  .concat(stateValue !== undefined ? [stateValue] : [,])
                  .concat(items.slice(index))
              : items,
          visibleSections: visibleSections ? shiftVisibleSections(visibleSections, index, 1) : null
        }
      }
    )
  }

  // object property added, nothing to do
  return setIn(updatedState, toRecursiveStatePath(updatedJson, path), stateValue)
}

export function documentStateRemove2(
  updatedJson: unknown,
  documentState: DocumentState2,
  operation: JSONPatchRemove
): DocumentState2 {
  const path = parsePath(updatedJson, operation.path)
  const parentPath = initial(path)
  const parent = getIn(updatedJson, parentPath)

  if (Array.isArray(parent)) {
    return updateInDocumentState(
      updatedJson,
      documentState,
      parentPath,
      (arrayState: DocumentState2 | undefined) => {
        if (arrayState?.type !== 'array') {
          return arrayState
        }

        const index = int(last(path) as string)
        const { items, visibleSections } = arrayState

        return {
          ...arrayState,
          items: items.slice(0, index).concat(items.slice(index + 1)),
          visibleSections: visibleSections ? shiftVisibleSections(visibleSections, index, -1) : null
        }
      }
    )
  }

  return deleteIn(documentState, toRecursiveStatePath(updatedJson, path))
}

export function documentStateReplace2(
  updatedJson: unknown,
  documentState: DocumentState2,
  operation: JSONPatchReplace
): DocumentState2 {
  const path = parsePath(updatedJson, operation.path)

  return updateInDocumentState(updatedJson, documentState, path, (state) => {
    if (state) {
      if (Array.isArray(operation.value)) {
        if (state.type !== 'array') {
          return {
            type: 'array',
            expanded: state.type === 'object' ? state.expanded : false,
            visibleSections: null,
            items: [] as DocumentState2[]
          }
        }
      } else if (isObject(operation.value)) {
        if (state.type !== 'object') {
          return {
            type: 'object',
            expanded: state.type === 'array' ? state.expanded : false,
            properties: {}
          }
        }
      } else {
        // FIXME: convert to value state if possible instead of creating a new state
        if (state.type !== 'value') {
          return { type: 'value' }
        }
      }
    }

    return state
  })
}

export function documentStateMoveOrCopy2(
  updatedJson: unknown,
  documentState: DocumentState2,
  operation: JSONPatchCopy | JSONPatchMove
): DocumentState2 {
  if (isJSONPatchMove(operation) && operation.from === operation.path) {
    // nothing to do
    return documentState
  }

  let updatedState = documentState

  // get the state that we will move or copy
  const from = parsePath(updatedJson, operation.from)
  const stateValue = getIn<DocumentState2 | undefined>(
    updatedState,
    toRecursiveStatePath(updatedJson, from)
  )

  if (isJSONPatchMove(operation)) {
    updatedState = documentStateRemove2(updatedJson, updatedState, {
      op: 'remove',
      path: operation.from
    })
  }

  updatedState = documentStateAdd2(
    updatedJson,
    updatedState,
    {
      op: 'add',
      path: operation.path,
      value: null // note that the value is not actually used, so we just use null instead of getting the actual value from the json
    },
    stateValue
  )

  return updatedState
}

/**
 * Apply patch operations to both json and state
 */
// FIXME: remove the original documentStatePatch
export function documentStatePatch(
  json: unknown,
  documentState: DocumentState,
  operations: JSONPatchDocument
): { json: unknown; documentState: DocumentState } {
  const updatedJson: unknown = immutableJSONPatch(json, operations)

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

    if (isJSONPatchCopy(operation) || isJSONPatchMove(operation)) {
      return documentStateMoveOrCopy(updatedJson, updatingState, operation)
    }

    return updatingState
  }, documentState)

  return {
    json: updatedJson,
    documentState: updatedDocumentState
  }
}

export function documentStateAdd(
  json: unknown,
  documentState: DocumentState,
  operation: JSONPatchAdd
): DocumentState {
  const path = parsePath(json, operation.path)
  const parentPath = initial(path)
  const parentPointer = compileJSONPointer(parentPath)
  const parent = getIn(json, parentPath)

  if (isJSONArray(parent)) {
    const index = int(last(path) as string)

    // shift all paths of the relevant parts of the state
    const expandedMap = shiftPath(documentState.expandedMap, parentPath, index, 1)
    const enforceStringMap = shiftPath(documentState.enforceStringMap, parentPath, index, 1)
    let visibleSectionsMap = shiftPath(documentState.visibleSectionsMap, parentPath, index, 1)

    // shift visible sections of array
    visibleSectionsMap = updateInPathsMap(visibleSectionsMap, parentPointer, (sections) =>
      shiftVisibleSections(sections, index, 1)
    )

    return {
      ...documentState,
      expandedMap,
      enforceStringMap,
      visibleSectionsMap
    }
  }

  // object, nothing to do
  return documentState
}

export function documentStateRemove(
  updatedJson: unknown,
  documentState: DocumentState,
  operation: JSONPatchRemove
): DocumentState {
  const path = parsePath(updatedJson, operation.path)
  const parentPath = initial(path)
  const parentPointer = compileJSONPointer(parentPath)
  const parent = getIn(updatedJson, parentPath)

  let { expandedMap, enforceStringMap, visibleSectionsMap } = documentState

  // delete the path itself and its children
  expandedMap = deletePath(expandedMap, path)
  enforceStringMap = deletePath(enforceStringMap, path)
  visibleSectionsMap = deletePath(visibleSectionsMap, path)

  if (isJSONArray(parent)) {
    const index = int(last(path) as string)

    // shift all paths of the relevant parts of the state
    expandedMap = shiftPath(expandedMap, parentPath, index, -1)
    enforceStringMap = shiftPath(enforceStringMap, parentPath, index, -1)
    visibleSectionsMap = shiftPath(visibleSectionsMap, parentPath, index, -1)

    // shift visible sections of array
    visibleSectionsMap = updateInPathsMap(visibleSectionsMap, parentPointer, (sections) =>
      shiftVisibleSections(sections, index, -1)
    )
  }

  return {
    ...documentState,
    expandedMap,
    enforceStringMap,
    visibleSectionsMap
  }
}

export function documentStateReplace(
  updatedJson: unknown,
  documentState: DocumentState,
  operation: JSONPatchReplace
): DocumentState {
  const pointer = operation.path

  // cleanup state from paths that are removed now
  const expandedMap = cleanupNonExistingPaths(updatedJson, documentState.expandedMap)
  const enforceStringMap = cleanupNonExistingPaths(updatedJson, documentState.enforceStringMap)
  const visibleSectionsMap = cleanupNonExistingPaths(updatedJson, documentState.visibleSectionsMap)

  // cleanup props of the object/array/value itself that are not applicable anymore
  if (!isJSONObject(operation.value) && !isJSONArray(operation.value)) {
    delete expandedMap[pointer]
  }
  if (!isJSONArray(operation.value)) {
    delete visibleSectionsMap[pointer]
  }
  if (isJSONObject(operation.value) || isJSONArray(operation.value)) {
    delete enforceStringMap[pointer]
  }

  return {
    ...documentState,
    expandedMap,
    enforceStringMap,
    visibleSectionsMap
  }
}

export function documentStateMoveOrCopy(
  updatedJson: unknown,
  documentState: DocumentState,
  operation: JSONPatchCopy | JSONPatchMove
): DocumentState {
  if (isJSONPatchMove(operation) && operation.from === operation.path) {
    // nothing to do
    return documentState
  }

  // get the state that we will move or copy, and move it to the new location
  const renamePointer = (pointer: JSONPointer) =>
    operation.path + pointer.substring(operation.from.length)
  const expandedMapCopy = movePath(
    filterPath(documentState.expandedMap, operation.from),
    renamePointer
  )
  const enforceStringMapCopy = movePath(
    filterPath(documentState.enforceStringMap, operation.from),
    renamePointer
  )
  const visibleSectionsMapCopy = movePath(
    filterPath(documentState.visibleSectionsMap, operation.from),
    renamePointer
  )

  // patch the document state: use the remove and add operations to apply a move or copy
  // note that `value` is just a fake value, we do not use this for real
  let updatedState = documentState
  if (isJSONPatchMove(operation)) {
    updatedState = documentStateRemove(updatedJson, updatedState, {
      op: 'remove',
      path: operation.from
    })
  }
  updatedState = documentStateAdd(updatedJson, updatedState, {
    op: 'add',
    path: operation.path,
    value: null
  })

  // merge the original and the copied state
  const expandedMap = mergePaths(updatedState.expandedMap, expandedMapCopy)
  const enforceStringMap = mergePaths(updatedState.enforceStringMap, enforceStringMapCopy)
  const visibleSectionsMap = mergePaths(updatedState.visibleSectionsMap, visibleSectionsMapCopy)

  return {
    ...documentState,
    expandedMap,
    enforceStringMap,
    visibleSectionsMap
  }
}

/**
 * Delete a path from a PathsMap. Will delete the path and its child paths
 * IMPORTANT: will NOT shift array items when an array item is removed, use shiftPath for that
 */
export function deletePath<T>(map: JSONPointerMap<T>, path: JSONPath): JSONPointerMap<T> {
  const updatedMap: JSONPointerMap<T> = {}
  const pointer = compileJSONPointer(path)

  // partition the contents of the map
  Object.keys(map).forEach((itemPointer) => {
    if (!startsWithJSONPointer(itemPointer, pointer)) {
      updatedMap[itemPointer] = map[itemPointer]
    }
  })

  return updatedMap
}

// TODO: unit test
export function filterPath<T>(map: JSONPointerMap<T>, pointer: JSONPointer): JSONPointerMap<T> {
  const filteredMap: JSONPointerMap<T> = {}

  Object.keys(map).forEach((itemPointer) => {
    if (startsWithJSONPointer(itemPointer, pointer)) {
      filteredMap[itemPointer] = map[itemPointer]
    }
  })

  return filteredMap
}

// TODO: unit test
export function mergePaths<T>(a: JSONPointerMap<T>, b: JSONPointerMap<T>): JSONPointerMap<T> {
  return { ...a, ...b }
}

// TODO: unit test
export function movePath<T>(
  map: JSONPointerMap<T>,
  changePointer: (pointer: JSONPointer) => JSONPointer
): JSONPointerMap<T> {
  const movedMap: JSONPointerMap<T> = {}

  Object.keys(map).forEach((oldPointer) => {
    const newPointer = changePointer(oldPointer)
    movedMap[newPointer] = map[oldPointer]
  })

  return movedMap
}

export function shiftPath<T>(
  map: JSONPointerMap<T>,
  path: JSONPath,
  index: number,
  offset: number
): JSONPointerMap<T> {
  const indexPathPos = path.length
  const pointer = compileJSONPointer(path)

  // collect all paths that need to be shifted, with their old path, new path, and value
  const matches: { oldPointer: JSONPointer; newPointer: JSONPointer; value: T }[] = []
  for (const itemPointer of Object.keys(map)) {
    if (startsWithJSONPointer(itemPointer, pointer)) {
      const itemPath: JSONPath = parseJSONPointer(itemPointer)
      const pathIndex = int(itemPath[indexPathPos])

      if (pathIndex >= index) {
        itemPath[indexPathPos] = String(pathIndex + offset)

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
export function cleanupNonExistingPaths<T>(
  json: unknown,
  map: JSONPointerMap<T>
): JSONPointerMap<T> {
  const updatedMap: JSONPointerMap<T> = {}

  // TODO: for optimization, we could pass a filter callback which allows you to filter paths
  //  starting with a specific, so you don't need to invoke parseJSONPointer and existsIn for largest part

  Object.keys(map)
    .filter((pointer) => existsIn(json, parsePath(json, pointer)))
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
  map: JSONPointerMap<T>,
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
 * Shift visible sections in an Array with a specified offset
 */
export function shiftVisibleSections(
  visibleSections: VisibleSection[],
  index: number,
  offset: number
): VisibleSection[] {
  const shiftedSections = visibleSections.map((section) => {
    return {
      start: section.start > index ? section.start + offset : section.start,
      end: section.end > index ? section.end + offset : section.end
    }
  })

  return mergeAdjacentSections(shiftedSections)
}

// merge adjacent sections like [{start:0, end:100}, {start:100, end:200}] into [{start:0, end:200}]
function mergeAdjacentSections(visibleSections: VisibleSection[]): VisibleSection[] {
  const merged = visibleSections.slice(0)

  let i = 1
  while (i < merged.length) {
    if (merged[i - 1].end === merged[i].start) {
      merged[i - 1] = {
        start: merged[i - 1].start,
        end: merged[i].end
      }
      merged.splice(i)
    }
    i++
  }

  return merged
}

export function getEnforceString(
  value: unknown,
  enforceStringMap: JSONPointerMap<boolean> | undefined,
  pointer: JSONPointer,
  parser: JSONParser
): boolean {
  const enforceString = enforceStringMap ? enforceStringMap[pointer] : undefined

  if (typeof enforceString === 'boolean') {
    return enforceString
  }

  return isStringContainingPrimitiveValue(value, parser)
}

export function getNextKeys(keys: string[], key: string, includeKey = false): string[] {
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
export function getVisiblePaths(json: unknown, documentState: DocumentState): JSONPath[] {
  const paths: JSONPath[] = []

  function _recurse(value: unknown, path: JSONPath) {
    paths.push(path)
    const pointer = compileJSONPointer(path)

    if (value && documentState.expandedMap[pointer] === true) {
      if (isJSONArray(value)) {
        const visibleSections = getVisibleSections(documentState, pointer)
        forEachVisibleIndex(value, visibleSections, (index) => {
          _recurse(value[index], path.concat(String(index)))
        })
      }

      if (isJSONObject(value)) {
        Object.keys(value).forEach((key) => {
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
  json: unknown,
  documentState: DocumentState,
  includeInside = true
): CaretPosition[] {
  const paths: CaretPosition[] = []

  function _recurse(value: unknown, path: JSONPath) {
    paths.push({ path, type: CaretType.value })

    const pointer = compileJSONPointer(path)
    if (value && documentState.expandedMap[pointer] === true) {
      if (includeInside) {
        paths.push({ path, type: CaretType.inside })
      }

      if (isJSONArray(value)) {
        const visibleSections = getVisibleSections(documentState, pointer)
        forEachVisibleIndex(value, visibleSections, (index) => {
          const itemPath = path.concat(String(index))

          _recurse(value[index], itemPath)

          if (includeInside) {
            paths.push({ path: itemPath, type: CaretType.after })
          }
        })
      }

      if (isJSONObject(value)) {
        const keys = Object.keys(value)
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
  json: unknown,
  documentState: DocumentState,
  path: JSONPath
): JSONPath | null {
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
  json: unknown,
  documentState: DocumentState,
  path: JSONPath
): JSONPath | null {
  const visiblePaths = getVisiblePaths(json, documentState)
  const visiblePathPointers = visiblePaths.map(compileJSONPointer)
  const index = visiblePathPointers.indexOf(compileJSONPointer(path))

  if (index !== -1 && index < visiblePaths.length - 1) {
    return visiblePaths[index + 1]
  }

  return null
}

/**
 * Expand recursively when the expanded contents is small enough,
 * else expand in a minimalistic way
 */
// TODO: write unit test
export function expandRecursive(
  json: unknown,
  documentState: DocumentState,
  path: JSONPath
): DocumentState {
  const expandContents: unknown | undefined = getIn(json, path)
  if (expandContents === undefined) {
    return documentState
  }

  const expandAllRecursive = !isLargeContent({ json: expandContents }, MAX_DOCUMENT_SIZE_EXPAND_ALL)
  const expandCallback = expandAllRecursive ? expandAll : expandMinimal

  return expandWithCallback(json, documentState, path, expandCallback)
}

// TODO: write unit test
export function expandMinimal(path: JSONPath): boolean {
  return path.length === 0 ? true : path.length === 1 && path[0] === '0' // first item of an array
}

// TODO: write unit test
export function expandAll(): boolean {
  return true
}

// TODO: write unit test
export function getDefaultExpand(json: unknown): OnExpand {
  return isLargeContent({ json }, MAX_DOCUMENT_SIZE_EXPAND_ALL) ? expandMinimal : expandAll
}
