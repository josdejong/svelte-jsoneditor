import {
  compileJSONPointer,
  existsIn,
  getIn,
  immutableJSONPatch,
  parseJSONPointer,
  setIn
} from 'immutable-json-patch'
import { initial, isEqual, last } from 'lodash-es'
import { DEFAULT_VISIBLE_SECTIONS } from '../constants.js'
import { arrayStartsWith, forEachIndex } from '../utils/arrayUtils.js'
import { parseJSONPointerWithArrayIndices } from '../utils/jsonPointer.js'
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
  JSONArray,
  JSONData,
  JSONObject,
  JSONPatchAdd,
  JSONPatchCopy,
  JSONPatchDocument,
  JSONPatchMove,
  JSONPatchRemove,
  JSONPatchReplace,
  Path,
  PathsMap,
  PathStr,
  Section,
  VisibleSection
} from '../types'
import { parsePath, stringifyPath } from '../utils/pathUtils.js'
import { traverse } from '../utils/objectUtils.js'
import { createDebug } from '../utils/debug.js'
import { CaretType } from '../types.js'
import { isJSONArray, isJSONObject } from '../utils/jsonUtils.js'
import {
  isJSONPatchAdd,
  isJSONPatchCopy,
  isJSONPatchMove,
  isJSONPatchRemove,
  isJSONPatchReplace
} from '../typeguards.js'

const debug = createDebug('jsoneditor:documentState')

/**
 * Sync a state object with the json it belongs to: update keys, limit, and expanded state
 *
 * When forceRefresh=true, force refreshing the expanded state
 */
// TODO: refactor syncState so we don't have to pass path=[] all the time, this is only used internally for recursiveness
export function syncState(
  json: JSONData,
  state: JSONData,
  path: Path,
  expand: (path: Path) => boolean,
  forceRefresh = false
): JSONData {
  // TODO: this function can be made way more efficient if we pass prevState:
  //  when immutable, we can simply be done already when the state === prevState
  console.log('syncState', forceRefresh)

  const updatedState = Array.isArray(json) ? [] : {}

  // updatedState[STATE_ID] = state && state[STATE_ID] ? state[STATE_ID] : uniqueId()
  //
  // if (isObject(json)) {
  //   updatedState[STATE_KEYS] = syncKeys(json, state && state[STATE_KEYS])
  //
  //   updatedState[STATE_EXPANDED] = state && !forceRefresh ? state[STATE_EXPANDED] : expand(path)
  //
  //   if (updatedState[STATE_EXPANDED]) {
  //     Object.keys(json).forEach((key) => {
  //       const childJson = json[key]
  //       const childState = state && state[key]
  //       updatedState[key] = syncState(childJson, childState, path.concat(key), expand, forceRefresh)
  //     })
  //   }
  //
  //   // FIXME: must create new id's in case of duplicate id's
  // } else if (Array.isArray(json)) {
  //   updatedState[STATE_EXPANDED] = state && !forceRefresh ? state[STATE_EXPANDED] : expand(path)
  //
  //   // note that we reset the visible items when the state is not expanded
  //   updatedState[STATE_VISIBLE_SECTIONS] =
  //     state && updatedState[STATE_EXPANDED]
  //       ? state[STATE_VISIBLE_SECTIONS] || DEFAULT_VISIBLE_SECTIONS
  //       : DEFAULT_VISIBLE_SECTIONS
  //
  //   if (updatedState[STATE_EXPANDED]) {
  //     updatedState[STATE_VISIBLE_SECTIONS].forEach(({ start, end }) => {
  //       forEachIndex(start, Math.min(json.length, end), (index) => {
  //         const childJson = json[index]
  //         const childState = state && state[index]
  //         updatedState[index] = syncState(
  //           childJson,
  //           childState,
  //           path.concat(index),
  //           expand,
  //           forceRefresh
  //         )
  //       })
  //     })
  //   }
  // } else {
  //   // primitive value (string, number, boolean, null)
  //   if (state && state[STATE_ENFORCE_STRING] !== undefined) {
  //     // keep as is
  //     updatedState[STATE_ENFORCE_STRING] = state[STATE_ENFORCE_STRING]
  //   } else if (isStringContainingPrimitiveValue(json)) {
  //     // set to true when needed (else, leave undefined)
  //     updatedState[STATE_ENFORCE_STRING] = true
  //   }
  // }

  return updatedState
}

export function createState(json) {
  if (Array.isArray(json)) {
    const state = []

    // state[STATE_ID] = uniqueId()
    // state[STATE_EXPANDED] = false
    // state[STATE_VISIBLE_SECTIONS] = DEFAULT_VISIBLE_SECTIONS

    return state
  }

  if (isObject(json)) {
    const state = {}

    // state[STATE_ID] = uniqueId()
    // state[STATE_EXPANDED] = false
    // state[STATE_KEYS] = Object.keys(json)

    return state
  }

  // primitive value
  const state = {
    // [STATE_ID]: uniqueId()
  }
  // if (isStringContainingPrimitiveValue(json)) {
  //   state[STATE_ENFORCE_STRING] = true
  // }

  return state
}

export function createDocumentState(): DocumentState {
  return {
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
}

// TODO: write unit test
export function createExpandedDocumentState(json, expandedCallback: (path: Path) => boolean) {
  return expandWithCallback(json, createDocumentState(), [], expandedCallback)
}

export function getVisibleSections(
  documentState: DocumentState,
  pathStr: PathStr
): VisibleSection[] {
  return documentState.visibleSectionsMap[pathStr] || DEFAULT_VISIBLE_SECTIONS
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
    const partialPathStr = stringifyPath(partialPath)

    const value = getIn(json, partialPath)

    if (isObjectOrArray(value)) {
      expanded[partialPathStr] = true
    }

    // if needed, enlarge the expanded sections such that the search result becomes visible in the array
    if (Array.isArray(value) && i < path.length) {
      const sections = visibleSections[partialPathStr] || DEFAULT_VISIBLE_SECTIONS
      const index = path[i] as number

      if (!inVisibleSection(sections, index)) {
        const start = currentRoundNumber(index)
        const end = nextRoundNumber(start)
        const newSection = { start, end }
        visibleSections[partialPathStr] = mergeSections(sections.concat(newSection))
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
 * Expand a node, end expand it's childs according to the provided callback
 * Nodes that are already expanded will be left untouched
 */
export function expandWithCallback(
  json: JSONData,
  state: DocumentState,
  path: Path,
  expandedCallback: (path: Path) => boolean
): DocumentState {
  const expanded = { ...state.expandedMap }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const contents: JSONData = getIn(json, path)
  traverse(contents, (value, nestedPath) => {
    if (isObjectOrArray(value) && expandedCallback(nestedPath)) {
      expanded[stringifyPath(nestedPath)] = true
    } else {
      // do not iterate over the childs of this object or array
      return false
    }
  })

  return {
    ...state,
    expandedMap: expanded
  }
}

// TODO: write unit tests
export function collapsePath(state: DocumentState, path: Path): DocumentState {
  const pathStr = stringifyPath(path)

  const expanded = { ...state.expandedMap }

  // delete the expanded state of the path and all it's nested paths
  for (const key of Object.keys(expanded)) {
    if (key.startsWith(pathStr) && key in expanded) {
      delete expanded[key]
    }
  }

  return {
    ...state,
    expandedMap: expanded
  }
}

// TODO: write unit tests
export function setEnforceString(
  state: DocumentState,
  pathStr: PathStr,
  enforceString: boolean
): DocumentState {
  if (enforceString) {
    const updatedEnforceString = { ...state.enforceStringMap }
    updatedEnforceString[pathStr] = enforceString

    return {
      ...state,
      enforceStringMap: updatedEnforceString
    }
  } else {
    // remove if defined
    if (typeof state.enforceStringMap[pathStr] === 'boolean') {
      const updatedEnforceString = { ...state.enforceStringMap }
      delete updatedEnforceString[pathStr]
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
  pathStr: PathStr,
  section: Section
): DocumentState {
  return {
    ...state,
    visibleSectionsMap: {
      ...state.visibleSectionsMap,
      [pathStr]: mergeSections(getVisibleSections(state, pathStr).concat(section))
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
  // TODO: split this function in smaller functions, it's too large

  // FIXME: refactor documentStatePatch

  // function before(state: JSONData, operation: JSONPatchOperation) {
  //   const { op, path, from } = operation
  //   const parentPath: Path = initial(path)
  //   const parent = getIn(json, parentPath)
  //
  //   let updatedState = state
  //   let updatedOperation = operation
  //
  //   // correctly create state value
  //   if (operation.value !== undefined) {
  //     updatedOperation = {
  //       ...updatedOperation,
  //       value: createState(operation.value)
  //     }
  //   }
  //
  //   // TODO: when path or from is not existing in updatedState, expand that now so we can handle it
  //
  //   if (op === 'add' || op === 'copy') {
  //     const keys = getKeys(state, parentPath as JSONPath)
  //     if (keys) {
  //       // this is a property inside an object
  //       // add the key to STATE_KEYS if needed
  //       const key = last(path) as string
  //       if (!keys.includes(key)) {
  //         updatedState = appendToKeys(updatedState, parentPath, key)
  //       }
  //     }
  //
  //     // shift the visible sections one down
  //     updatedState = shiftVisibleSections(updatedState, path, 1)
  //   }
  //
  //   if (op === 'move') {
  //     const parentPath: Path = initial(path)
  //     const keys = getKeys(updatedState, parentPath as JSONPath)
  //     const oldKey = last(from) as string
  //     const newKey = last(path) as string
  //
  //     if (isEqual(initial(from), initial(path))) {
  //       // move inside the same object
  //       if (keys) {
  //         if (oldKey !== newKey) {
  //           // A key is renamed
  //
  //           // in case the new key is different but will replace an existing key, remove the existing key
  //           updatedState = removeFromKeys(updatedState, parentPath, newKey)
  //
  //           // Replace the key in the object's STATE_KEYS so it maintains its index
  //           updatedState = replaceInKeys(updatedState, parentPath, oldKey, newKey)
  //         } else {
  //           // key is not renamed but moved -> move it to the end of the keys
  //           updatedState = removeFromKeys(updatedState, parentPath, newKey)
  //           updatedState = appendToKeys(updatedState, parentPath, newKey)
  //         }
  //       }
  //     } else {
  //       // move from one object/array to an other -> remove old key, add new key
  //       const fromParentPath: Path = initial(from)
  //       const fromKeys = getKeys(updatedState, fromParentPath as JSONPath)
  //       if (fromKeys) {
  //         updatedState = removeFromKeys(updatedState, fromParentPath, oldKey)
  //       }
  //       if (keys) {
  //         updatedState = appendToKeys(updatedState, parentPath, newKey)
  //       }
  //     }
  //
  //     // shift the visible sections one up from where removed, and one down from where inserted
  //     updatedState = shiftVisibleSections(updatedState, from, -1)
  //     updatedState = shiftVisibleSections(updatedState, path, 1)
  //
  //     // we must keep the existing state for example when renaming an object property
  //     const existingState = getIn(state, from)
  //     updatedOperation = { ...updatedOperation, value: existingState }
  //   }
  //
  //   if (op === 'remove') {
  //     const parentPath: Path = initial(path)
  //     const keys = getKeys(updatedState, parentPath as JSONPath)
  //     if (keys) {
  //       // remove old key
  //       const oldKey = last(path) as string
  //       updatedState = removeFromKeys(updatedState, parentPath, oldKey)
  //     } else {
  //       // shift the visible sections one up
  //       updatedState = shiftVisibleSections(updatedState, path, -1)
  //     }
  //   }
  //
  //   if (op === 'replace') {
  //     const parentPath: Path = initial(path)
  //     const keys = getKeys(updatedState, parentPath as JSONPath)
  //     if (keys) {
  //       const key = last(path) as string
  //       if (!keys.includes(key)) {
  //         updatedState = appendToKeys(updatedState, parentPath, key)
  //       }
  //     }
  //   }
  //
  //   return {
  //     json: updatedState,
  //     operation: updatedOperation
  //   }
  // }
  //
  // function after(state, operation, previousState) {
  //   const { op, path } = operation
  //
  //   let updatedState = state
  //
  //   if (op === 'copy') {
  //     // copying state will introduce duplicate id's -> replace with a new id
  //     if (existsIn(updatedState, path.concat([STATE_ID]))) {
  //       updatedState = setIn(updatedState, path.concat([STATE_ID]), uniqueId())
  //     }
  //   }
  //
  //   if (op === 'replace') {
  //     // copy the old enforceString state after replacing a value
  //     const enforceString = getIn(previousState, path.concat([STATE_ENFORCE_STRING]))
  //     if (typeof enforceString === 'boolean') {
  //       updatedState = setIn(updatedState, path.concat([STATE_ENFORCE_STRING]), enforceString)
  //     }
  //   }
  //
  //   return updatedState
  // }

  // debug('documentStatePatch', json, state, operations) // TODO: cleanup logging

  const updatedJson = immutableJSONPatch(json, operations) as JSONData

  // FIXME: cleanup updating old state
  // const initializedState = initializeState(json, state, operations)
  // const updatedState = immutableJSONPatch(initializedState, operations, { before, after }) // FIXME: use or cleanup
  // const updatedState = immutableJSONPatch(initializedState, operations)

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

  // FIXME: can we refresh selection, search, and validation in one go too for documentState?

  return {
    json: updatedJson as JSONData,
    documentState: updatedDocumentState
  }
}

export function documentStateAdd(
  json: JSONData,
  documentState: DocumentState,
  operation: JSONPatchAdd
): DocumentState {
  const path = parseJSONPointer(operation.path)
  const parentPath = initial(path)
  const parentPathStr = stringifyPath(parentPath)
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
    visibleSections = updateInPathsMap(visibleSections, parentPathStr, (sections) =>
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
    const keys = addKey(documentState.keysMap, parentPathStr, key)

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
  const path = parseJSONPointer(operation.path)
  const parentPath = initial(path)
  const parentPathStr = stringifyPath(parentPath)
  const parent = getIn(updatedJson, parentPath)

  let { expandedMap, enforceStringMap, visibleSectionsMap, keysMap } = documentState

  // delete the path itself and its children
  expandedMap = deletePath(updatedJson, expandedMap, path)[0]
  enforceStringMap = deletePath(updatedJson, enforceStringMap, path)[0]
  visibleSectionsMap = deletePath(updatedJson, visibleSectionsMap, path)[0]
  keysMap = deletePath(updatedJson, keysMap, path)[0]

  if (isJSONArray(parent)) {
    const index = last(path) as number

    // shift all paths of the relevant parts of the state
    expandedMap = shiftPath(expandedMap, parentPath, index, -1)
    enforceStringMap = shiftPath(enforceStringMap, parentPath, index, -1)
    keysMap = shiftPath(keysMap, parentPath, index, -1)
    visibleSectionsMap = shiftPath(visibleSectionsMap, parentPath, index, -1)

    // shift visible sections of array
    visibleSectionsMap = updateInPathsMap(visibleSectionsMap, parentPathStr, (sections) =>
      shiftVisibleSections(sections, index, -1)
    )
  }

  if (isJSONObject(parent)) {
    // in case of an object property, remove the key
    const key = last(path) as string
    keysMap = removeKey(keysMap, parentPathStr, key)
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
  const path = parseJSONPointer(operation.path)
  const pathStr = stringifyPath(path)
  const value = getIn(updatedJson, path)

  // cleanup state from paths that are removed now
  let keysMap = cleanupNonExistingPaths(updatedJson, documentState.keysMap)
  const expandedMap = cleanupNonExistingPaths(updatedJson, documentState.expandedMap)
  const enforceStringMap = cleanupNonExistingPaths(updatedJson, documentState.enforceStringMap)
  const visibleSectionsMap = cleanupNonExistingPaths(updatedJson, documentState.visibleSectionsMap)

  // cleanup props of the object/array/value itself that are not applicable anymore
  if (!isJSONObject(operation.value) && !isJSONArray(operation.value)) {
    delete expandedMap[pathStr]
  }
  if (!isJSONObject(operation.value)) {
    delete keysMap[pathStr]
  }
  if (!isJSONArray(operation.value)) {
    delete visibleSectionsMap[pathStr]
  }
  if (isJSONObject(operation.value) || isJSONArray(operation.value)) {
    delete enforceStringMap[pathStr]
  }

  // update keys: remove old keys, and append new keys
  if (isJSONObject(operation.value)) {
    keysMap = updateKeys(keysMap, pathStr, (prevKeys) => syncKeys(Object.keys(value), prevKeys))
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
  const fromPath = parseJSONPointer(operation.from)
  const toPath = parseJSONPointer(operation.path)

  // get a copy of the state that we will duplicate
  const expandedMapCopy = filterPath(documentState.expandedMap, fromPath)
  const enforceStringMapCopy = filterPath(documentState.enforceStringMap, fromPath)
  const visibleSectionsMapCopy = filterPath(documentState.visibleSectionsMap, fromPath)
  const keysMapCopy = filterPath(documentState.keysMap, fromPath)

  let { expandedMap, enforceStringMap, visibleSectionsMap, keysMap } = documentStateAdd(
    updatedJson,
    documentState,
    {
      op: 'add',
      path: operation.path,
      value: undefined // just a fake value, we will not use this
    }
  )

  const renamePath = (path) => {
    return toPath.concat(path.slice(fromPath.length))
  }

  // move and merge the copied state
  expandedMap = mergePaths(expandedMap, movePath(expandedMapCopy, renamePath))
  enforceStringMap = mergePaths(enforceStringMap, movePath(enforceStringMapCopy, renamePath))
  visibleSectionsMap = mergePaths(visibleSectionsMap, movePath(visibleSectionsMapCopy, renamePath))
  keysMap = mergePaths(keysMap, movePath(keysMapCopy, renamePath))

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
    const path = parseJSONPointer(operation.path)
    const parentPath = initial(path)
    const toParent = getIn(updatedJson, parentPath)

    if (isJSONObject(toParent)) {
      // if an object key, move the key to the end of the keys
      const parentPathStr = stringifyPath(parentPath)
      const key = last(path) as string

      return {
        ...documentState,
        keysMap: updateKeys(documentState.keysMap, parentPathStr, (keys) => {
          return keys.filter((k) => k !== key).concat([key])
        })
      }
    }

    // in case of an array item, we don't have to do anything
    return documentState
  }

  const fromPath = parseJSONPointer(operation.from)
  const toPath = parseJSONPointer(operation.path)

  // get a copy of the state that we will duplicate
  const expandedMapCopy = filterPath(documentState.expandedMap, fromPath)
  const enforceStringMapCopy = filterPath(documentState.enforceStringMap, fromPath)
  const visibleSectionsMapCopy = filterPath(documentState.visibleSectionsMap, fromPath)
  const keysMapCopy = filterPath(documentState.keysMap, fromPath)

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

  const renamePath = (path) => {
    return toPath.concat(path.slice(fromPath.length))
  }

  // move and merge the copied state
  expandedMap = mergePaths(expandedMap, movePath(expandedMapCopy, renamePath))
  enforceStringMap = mergePaths(enforceStringMap, movePath(enforceStringMapCopy, renamePath))
  visibleSectionsMap = mergePaths(visibleSectionsMap, movePath(visibleSectionsMapCopy, renamePath))
  keysMap = mergePaths(keysMap, movePath(keysMapCopy, renamePath))

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
  json: JSONData,
  map: PathsMap<T>,
  path: Path
): [updatedMap: PathsMap<T>, deletedMap: PathsMap<T>] {
  const updatedMap: PathsMap<T> = {}
  const deletedMap: PathsMap<T> = {}

  // partition the contents of the map
  Object.keys(map).forEach((itemPathStr) => {
    const itemPath = parsePath(itemPathStr)

    if (!arrayStartsWith(itemPath, path)) {
      updatedMap[itemPathStr] = map[itemPathStr]
    } else {
      deletedMap[itemPathStr] = map[itemPathStr]
    }
  })

  return [updatedMap, deletedMap]
}

// TODO: unit test
export function filterPath<T>(map: PathsMap<T>, path: Path): PathsMap<T> {
  const filteredMap: PathsMap<T> = {}

  Object.keys(map).forEach((itemPathStr) => {
    if (arrayStartsWith(parsePath(itemPathStr), path)) {
      filteredMap[itemPathStr] = map[itemPathStr]
    }
  })

  return filteredMap
}

// TODO: unit test
export function mergePaths<T>(a: PathsMap<T>, b: PathsMap<T>): PathsMap<T> {
  return { ...a, ...b }
}

// TODO: unit test
export function movePath<T>(map: PathsMap<T>, changePath: (path: Path) => Path): PathsMap<T> {
  const movedMap: PathsMap<T> = {}

  Object.keys(map).forEach((oldPathStr) => {
    const oldPath = parsePath(oldPathStr)
    const newPath = changePath(oldPath)
    const newPathStr = stringifyPath(newPath)
    movedMap[newPathStr] = map[oldPathStr]
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

  // collect all paths that need to be shifted, with their old path, new path, and value
  const matches: { oldPathStr: string; newPathStr: string; value: T }[] = []
  for (const itemPathStr of Object.keys(map)) {
    const itemPath = parsePath(itemPathStr)

    if (arrayStartsWith(itemPath, path)) {
      const pathIndex = itemPath[indexPathPos] as number

      if (pathIndex >= index) {
        itemPath[indexPathPos] = pathIndex + offset

        matches.push({
          pathStr: itemPathStr,
          newPathStr: stringifyPath(itemPath),
          value: map[itemPathStr]
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
    delete updatedMap[match.oldPathStr]
  })

  // insert shifted paths in the map
  matches.forEach((match) => {
    updatedMap[match.newPathStr] = match.value
  })

  return updatedMap
}

// TODO: unit test
export function addKey(
  keysMap: PathsMap<string[]>,
  parentPathStr: PathStr,
  key: string
): PathsMap<string[]> {
  return updateKeys(keysMap, parentPathStr, (keys) => {
    return !keys.includes(key) ? keys.concat([key]) : keys
  })
}

// TODO: unit test
export function removeKey(
  keysMap: PathsMap<string[]>,
  parentPathStr: PathStr,
  key: string
): PathsMap<string[]> {
  const updatedKeysMap = updateInPathsMap(keysMap, parentPathStr, (keys) =>
    keys.includes(key) ? keys.filter((k) => k !== key) : keys
  )

  return updatedKeysMap !== keysMap ? updatedKeysMap : keysMap
}

// TODO: unit test
export function updateKeys(
  keysMap: PathsMap<string[]>,
  pathStr: PathStr,
  callback: (keys: string[]) => string[]
): PathsMap<string[]> {
  const updatedKeysMap = updateInPathsMap(keysMap, pathStr, callback)

  // we can do a cheap strict equality check here
  return updatedKeysMap !== keysMap ? updatedKeysMap : keysMap
}

// TODO: unit test
export function cleanupNonExistingPaths<T>(json: JSONData, map: PathsMap<T>): PathsMap<T> {
  const updatedMap = {}

  // TODO: for optimization, we could pass a filter callback which allows you to filter paths
  //  starting with a specific, so you don't need to invoke parsePath and existsIn for largest part

  Object.keys(map)
    .filter((pathStr) => existsIn(json, parsePath(pathStr)))
    .forEach((pathStr) => {
      updatedMap[pathStr] = map[pathStr]
    })

  return updatedMap
}

/**
 * Update a value in a PathsMap.
 * When the path exists, the callback will be invoked.
 * When the path does not exist, the callback is not invoked.
 */
export function updateInPathsMap<T>(map: PathsMap<T>, pathStr: PathStr, callback: (value: T) => T) {
  const value = map[pathStr]

  if (pathStr in map) {
    const updatedValue = callback(value)
    if (!isEqual(value, updatedValue)) {
      const updatedMap = { ...map }

      if (updatedValue === undefined) {
        delete updatedMap[pathStr]
      } else {
        updatedMap[pathStr] = updatedValue
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
export function transformPathsMap<T>(
  map: PathsMap<T>,
  callback: (pathStr: PathStr, value: T) => T
): PathsMap<T> {
  const transformedMap = {}

  Object.keys(map).forEach((pathStr) => {
    transformedMap[pathStr] = callback(pathStr, map[pathStr])
  })

  // TODO: make the function immutable when there are no actual changes

  return transformedMap
}

/**
 * Initialize the state needed to perform the JSON patch operations.
 * For example to a change in a nested object which is not expanded and
 * hence has no state initialize, we need to create this nested state
 * @param {JSON} json
 * @param {JSON} state
 * @param {JSONPatchDocument} operations
 */
export function initializeState(json, state, operations) {
  let updatedState = state

  function initializePath(json, state, path) {
    let updatedState = state

    if (existsIn(json, path) && !existsIn(updatedState, path)) {
      // first make sure the parent is initialized
      if (path.length > 0) {
        updatedState = initializePath(json, updatedState, initial(path))
      }

      // then initialize the state itself
      updatedState = setIn(updatedState, path, createState(getIn(json, path)))
    }

    return updatedState
  }

  operations.forEach((operation) => {
    const from =
      typeof operation.from === 'string'
        ? parseJSONPointerWithArrayIndices(json, operation.from)
        : null
    const path =
      typeof operation.path === 'string'
        ? parseJSONPointerWithArrayIndices(json, operation.path)
        : null

    if (operation.op === 'add') {
      updatedState = initializePath(json, updatedState, initial(path)) // initialize parent only
    }

    if (operation.op === 'copy' || operation.op === 'move') {
      updatedState = initializePath(json, updatedState, from)
      updatedState = initializePath(json, updatedState, initial(path)) // initialize parent only
    }

    if (operation.op === 'remove' || operation.op === 'replace' || operation.op === 'test') {
      updatedState = initializePath(json, updatedState, path)
    }
  })

  return updatedState
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
  pathStr: PathStr
): string[] {
  return documentState.keysMap[pathStr] || Object.keys(object)
}

export function getEnforceString(
  json: JSONData,
  documentState: DocumentState,
  pathStr: PathStr
): boolean {
  const enforceString = documentState.enforceStringMap[pathStr]

  if (typeof enforceString === 'boolean') {
    return enforceString
  }

  return isStringContainingPrimitiveValue(json)
}

// TODO: cleanup if not needed anymore
// /**
//  * Remove a key from the keys of an object at given path.
//  * Returns the updated state
//  */
// export function removeFromKeys(state: JSONData, path: Path, key: string): JSONData {
//   return updateIn(
//     state,
//     path.concat([STATE_KEYS as unknown as string]) as JSONPath,
//     (keys: string[]) => {
//       const index = keys.indexOf(key)
//       if (index === -1) {
//         return keys
//       }
//
//       const updatedKeys = keys.slice(0)
//       updatedKeys.splice(index, 1)
//
//       return updatedKeys
//     }
//   ) as JSONData
// }

// TODO: cleanup if not needed anymore
// export function replaceInKeys(state: JSONData, path: Path, oldKey: string, newKey: string) {
//   return updateIn(
//     state,
//     path.concat([STATE_KEYS as unknown as string]) as JSONPath,
//     (keys: string[]) => {
//       const index = keys.indexOf(oldKey)
//       if (index === -1) {
//         return keys
//       }
//
//       const updatedKeys = keys.slice(0)
//       updatedKeys.splice(index, 1, newKey)
//
//       return updatedKeys
//     }
//   )
// }

// TODO: cleanup
// export function appendToKeys(state: JSONData, path: Path, key: string): JSONData {
//   return updateIn(
//     state,
//     path.concat([STATE_KEYS as unknown as string]) as JSONPath,
//     (keys: string[]) => keys.concat(key)
//   ) as JSONData
// }

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
    const pathStr = stringifyPath(path)

    if (value && documentState.expandedMap[pathStr] === true) {
      if (isJSONArray(value)) {
        const visibleSections = getVisibleSections(documentState, pathStr)
        forEachVisibleIndex(value, visibleSections, (index) => {
          _recurse(value[index], path.concat(index))
        })
      }

      if (isJSONObject(value)) {
        getKeys(value, documentState, pathStr).forEach((key) => {
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

    const pathStr = stringifyPath(path)
    if (value && documentState.expandedMap[pathStr] === true) {
      if (includeInside) {
        paths.push({ path, type: CaretType.inside })
      }

      if (isJSONArray(value)) {
        const visibleSections = getVisibleSections(documentState, pathStr)
        forEachVisibleIndex(value, visibleSections, (index) => {
          const itemPath = path.concat(index)

          _recurse(value[index], itemPath)

          if (includeInside) {
            paths.push({ path: itemPath, type: CaretType.after })
          }
        })
      }

      if (isJSONObject(value)) {
        const keys = getKeys(value, documentState, pathStr)
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
