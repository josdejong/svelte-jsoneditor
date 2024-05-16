import {
  compileJSONPointer,
  deleteIn,
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
  parsePath,
  setIn,
  updateIn
} from 'immutable-json-patch'
import { initial, last } from 'lodash-es'
import { DEFAULT_VISIBLE_SECTIONS, MAX_DOCUMENT_SIZE_EXPAND_ALL } from '../constants.js'
import { forEachIndex } from '../utils/arrayUtils.js'
import { isObject, isStringContainingPrimitiveValue } from '../utils/typeUtils.js'
import {
  currentRoundNumber,
  inVisibleSection,
  mergeSections,
  nextRoundNumber
} from './expandItemsSections.js'
import type {
  ArrayDocumentState,
  CaretPosition,
  DocumentState,
  JSONParser,
  ObjectDocumentState,
  OnExpand,
  Section,
  ValueDocumentState,
  VisibleSection
} from '$lib/types'
import { CaretType } from '$lib/types.js'
import { int } from '../utils/numberUtils.js'
import { isLargeContent } from '$lib/utils/jsonUtils.js'
import {
  isArrayDocumentState,
  isExpandableState,
  isObjectDocumentState,
  isValueDocumentState
} from '$lib/typeguards.js'

export type CreateDocumentStateProps = {
  json: unknown | undefined
  expand?: OnExpand
}

export function createDocumentState({ json, expand }: CreateDocumentStateProps): DocumentState {
  let documentState: DocumentState = Array.isArray(json)
    ? createArrayDocumentState()
    : isObject(json)
      ? createObjectDocumentState()
      : createValueDocumentState()

  if (expand) {
    documentState = expandWithCallback(json, documentState, [], expand)
  }

  return documentState
}

export function createArrayDocumentState({ expanded } = { expanded: false }): ArrayDocumentState {
  return { type: 'array', expanded, visibleSections: DEFAULT_VISIBLE_SECTIONS, items: [] }
}

export function createObjectDocumentState({ expanded } = { expanded: false }): ObjectDocumentState {
  return { type: 'object', expanded, properties: {} }
}

export function createValueDocumentState(): ValueDocumentState {
  return { type: 'value' }
}

export function syncDocumentState(
  json: unknown,
  documentState: DocumentState | undefined
): DocumentState | undefined {
  if (json === undefined || documentState === undefined) {
    return undefined
  }

  if (Array.isArray(json)) {
    if (!isArrayDocumentState(documentState)) {
      const expanded = isExpandableState(documentState) ? documentState.expanded : false
      return createArrayDocumentState({ expanded })
    }

    const items: DocumentState[] = []
    for (let i = 0; i < Math.min(documentState.items.length, json.length); i++) {
      const state = syncDocumentState(json[i], documentState.items[i])
      if (state !== undefined) {
        items[i] = state
      }
    }

    return { ...documentState, items }
  }

  if (isObject(json)) {
    if (!isObjectDocumentState(documentState)) {
      const expanded = isExpandableState(documentState) ? documentState.expanded : false
      return createObjectDocumentState({ expanded })
    }

    const properties: ObjectDocumentState['properties'] = {}
    Object.keys(documentState.properties).forEach((key) => {
      const value = json[key]
      if (value !== undefined) {
        const state = syncDocumentState(value, documentState.properties[key])
        if (state !== undefined) {
          properties[key] = state
        }
      }
    })

    return { ...documentState, properties }
  }

  // value
  if (!isValueDocumentState(documentState)) {
    return undefined
  }

  return documentState
}

export function getVisibleSections(
  json: unknown,
  documentState: DocumentState,
  path: JSONPath
): VisibleSection[] {
  const valueState = getInDocumentState(json, documentState, path)

  return isArrayDocumentState(valueState) ? valueState.visibleSections : DEFAULT_VISIBLE_SECTIONS
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
  // FIXME: refactor an simplify this function. Create some handy util functions? The updateIn is hard to reason about
  let updatedState = documentState

  for (let i = 0; i < path.length; i++) {
    const partialPath = path.slice(0, i)
    const value = getIn(json, partialPath)

    if (Array.isArray(value)) {
      updatedState = updateInDocumentState(
        json,
        updatedState,
        partialPath,
        (state: DocumentState | undefined) => {
          const arrayState = isArrayDocumentState(state)
            ? { ...state, expanded: true }
            : createArrayDocumentState({ expanded: true })

          // if needed, enlarge the expanded sections such that the search result becomes visible in the array
          if (i < path.length) {
            const index = int(path[i])

            if (!inVisibleSection(arrayState.visibleSections, index)) {
              const start = currentRoundNumber(index)
              const end = nextRoundNumber(start)
              const newSection = { start, end }

              return {
                ...arrayState,
                visibleSections: mergeSections(arrayState.visibleSections.concat(newSection))
              }
            }
          }

          return arrayState
        }
      )
    }

    if (isObject(value)) {
      updatedState = updateInDocumentState(
        json,
        updatedState,
        partialPath,
        (state: DocumentState | undefined) => {
          return isObjectDocumentState(state)
            ? { ...state, expanded: true }
            : createObjectDocumentState({ expanded: true })
        }
      )
    }
  }

  return updatedState
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
export function expandWithCallback(
  json: unknown | undefined,
  documentState: DocumentState,
  path: JSONPath,
  expandedCallback: OnExpand
): DocumentState {
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
          (value: DocumentState | undefined) => {
            return value
              ? { ...value, expanded: true }
              : createArrayDocumentState({ expanded: true })
          }
        )

        if (value.length > 0) {
          currentStatePath.push('items')

          const visibleSections = getVisibleSections(json, documentState, path)

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
          (value: DocumentState | undefined) => {
            return value
              ? { ...value, expanded: true }
              : createObjectDocumentState({ expanded: true })
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
export function expandSingleItem(
  json: unknown,
  documentState: DocumentState,
  path: JSONPath
): DocumentState {
  const value = getIn(json, path)

  return updateInDocumentState(json, documentState, path, (state: DocumentState | undefined) => {
    if (isObject(value)) {
      return isObjectDocumentState(state)
        ? { ...state, expanded: true }
        : createObjectDocumentState({ expanded: true })
    }

    if (Array.isArray(value)) {
      return isArrayDocumentState(state)
        ? { ...state, expanded: true }
        : createArrayDocumentState({ expanded: true })
    }

    return isValueDocumentState(state) ? state : createValueDocumentState()
  })
}

// TODO: write unit tests
export function collapsePath(
  json: unknown,
  documentState: DocumentState,
  path: JSONPath
): DocumentState {
  return updateInDocumentState(json, documentState, path, (state: DocumentState | undefined) => {
    if (state?.type === 'object') {
      // clear the state of nested objects/arrays
      return createObjectDocumentState({ expanded: false })
    } else if (state?.type === 'array') {
      // clear the state of nested objects/arrays
      return createArrayDocumentState({ expanded: false })
    } else {
      return state
    }
  })
}

/**
 * Expand a section of items in an array
 */
export function expandSection(
  json: unknown,
  documentState: DocumentState,
  path: JSONPath,
  section: Section
): DocumentState {
  return updateInDocumentState(json, documentState, path, (state) => {
    if (!isArrayDocumentState(state)) {
      return state
    }

    const visibleSections = mergeSections([
      ...(state.visibleSections ?? DEFAULT_VISIBLE_SECTIONS),
      section
    ])

    return { ...state, visibleSections }
  })
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
  json: unknown,
  documentState: DocumentState,
  operations: JSONPatchDocument
): { json: unknown; state: DocumentState } {
  const updatedJson: unknown = immutableJSONPatch(json, operations)

  const updatedDocumentState = operations.reduce((updatingState, operation) => {
    if (isJSONPatchAdd(operation)) {
      return documentStateAdd(updatedJson, updatingState, operation, undefined)
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
    state: syncDocumentState(updatedJson, updatedDocumentState) as DocumentState
  }
}

export function getInDocumentState(
  json: unknown,
  documentState: DocumentState | undefined,
  path: JSONPath
): DocumentState | undefined {
  return getIn(documentState, toRecursiveStatePath(json, path))
}

export function setInDocumentState(
  json: unknown,
  documentState: DocumentState,
  path: JSONPath,
  value: unknown
): DocumentState {
  return setIn(documentState, toRecursiveStatePath(json, path), value)
}

export function updateInDocumentState(
  json: unknown,
  documentState: DocumentState,
  path: JSONPath,
  transform: (value: DocumentState | undefined) => DocumentState | undefined
) {
  return updateIn(documentState, toRecursiveStatePath(json, path), transform)
}

export function deleteInDocumentState(
  json: unknown,
  documentState: DocumentState,
  path: JSONPath
): DocumentState {
  return deleteIn(documentState, toRecursiveStatePath(json, path))
}

export function documentStateAdd(
  updatedJson: unknown,
  documentState: DocumentState,
  operation: JSONPatchAdd,
  stateValue: DocumentState | undefined
): DocumentState {
  const path = parsePath(updatedJson, operation.path)
  const parentPath = initial(path)
  const parent = getIn(updatedJson, parentPath)

  let updatedState = documentState

  if (Array.isArray(parent)) {
    updatedState = updateInDocumentState(
      updatedJson,
      updatedState,
      parentPath,
      (arrayState: DocumentState | undefined) => {
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
          visibleSections: shiftVisibleSections(visibleSections, index, 1)
        }
      }
    )
  }

  // object property added, nothing to do
  return setInDocumentState(updatedJson, updatedState, path, stateValue)
}

export function documentStateRemove(
  updatedJson: unknown,
  documentState: DocumentState,
  operation: JSONPatchRemove
): DocumentState {
  const path = parsePath(updatedJson, operation.path)
  const parentPath = initial(path)
  const parent = getIn(updatedJson, parentPath)

  if (Array.isArray(parent)) {
    return updateInDocumentState(
      updatedJson,
      documentState,
      parentPath,
      (arrayState: DocumentState | undefined) => {
        if (arrayState?.type !== 'array') {
          return arrayState
        }

        const index = int(last(path) as string)
        const { items, visibleSections } = arrayState

        return {
          ...arrayState,
          items: items.slice(0, index).concat(items.slice(index + 1)),
          visibleSections: shiftVisibleSections(visibleSections, index, -1)
        }
      }
    )
  }

  return deleteInDocumentState(updatedJson, documentState, path)
}

export function documentStateReplace(
  updatedJson: unknown,
  documentState: DocumentState,
  operation: JSONPatchReplace
): DocumentState {
  const path = parsePath(updatedJson, operation.path)

  return updateInDocumentState(updatedJson, documentState, path, (state) => {
    if (state) {
      if (Array.isArray(operation.value)) {
        if (!isArrayDocumentState(state)) {
          return createArrayDocumentState({
            expanded: isObjectDocumentState(state) ? state.expanded : false
          })
        }
      } else if (isObject(operation.value)) {
        if (!isObjectDocumentState(state)) {
          return createObjectDocumentState({
            expanded: isArrayDocumentState(state) ? state.expanded : false
          })
        }
      } else {
        if (!isValueDocumentState(state)) {
          return createValueDocumentState()
        }
      }
    }

    return state
  })
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

  let updatedState = documentState

  // get the state that we will move or copy
  const from = parsePath(updatedJson, operation.from)
  const stateValue = getInDocumentState(updatedJson, updatedState, from)

  if (isJSONPatchMove(operation)) {
    updatedState = documentStateRemove(updatedJson, updatedState, {
      op: 'remove',
      path: operation.from
    })
  }

  updatedState = documentStateAdd(
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
  json: unknown,
  documentState: DocumentState | undefined,
  path: JSONPath,
  parser: JSONParser
): boolean {
  const value = getIn(json, path)
  const nestedState = getInDocumentState(json, documentState, path)
  const enforceString = isValueDocumentState(nestedState) ? nestedState.enforceString : undefined

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

  function _recurse(value: unknown, state: DocumentState | undefined, path: JSONPath) {
    paths.push(path)

    if (isJSONArray(value) && isArrayDocumentState(state) && state.expanded) {
      forEachVisibleIndex(value, state.visibleSections, (index) => {
        _recurse(value[index], state.items[index], path.concat(String(index)))
      })
    }

    if (isJSONObject(value) && isObjectDocumentState(state) && state.expanded) {
      Object.keys(value).forEach((key) => {
        _recurse(value[key], state.properties[key], path.concat(key))
      })
    }
  }

  _recurse(json, documentState, [])

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

    const valueState = getInDocumentState(json, documentState, path)
    if (value && isExpandableState(valueState) && valueState.expanded) {
      if (includeInside) {
        paths.push({ path, type: CaretType.inside })
      }

      if (isJSONArray(value)) {
        const visibleSections = isArrayDocumentState(valueState)
          ? valueState.visibleSections
          : DEFAULT_VISIBLE_SECTIONS
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
