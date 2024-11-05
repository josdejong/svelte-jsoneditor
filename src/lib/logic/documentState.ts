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
  type JSONPatchOperation,
  type JSONPatchRemove,
  type JSONPath,
  parsePath,
  setIn,
  updateIn
} from 'immutable-json-patch'
import { initial, last } from 'lodash-es'
import { DEFAULT_VISIBLE_SECTIONS, MAX_DOCUMENT_SIZE_EXPAND_ALL } from '../constants.js'
import { forEachIndex, insertItemsAt, strictShallowEqual } from '../utils/arrayUtils.js'
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
  ObjectDocumentState,
  OnExpand,
  ArrayRecursiveState,
  RecursiveState,
  RecursiveStateFactory,
  Section,
  ValueDocumentState,
  VisibleSection
} from '$lib/types'
import { CaretType } from '$lib/types.js'
import { int } from '../utils/numberUtils.js'
import { isLargeContent } from '$lib/utils/jsonUtils.js'
import {
  isArrayRecursiveState,
  isExpandableState,
  isObjectRecursiveState,
  isValueRecursiveState
} from '$lib/typeguards.js'

export type CreateRecursiveStateProps = {
  json: unknown | undefined
  factory: RecursiveStateFactory
}

export function createRecursiveState({
  json,
  factory
}: CreateRecursiveStateProps): RecursiveState | undefined {
  return Array.isArray(json)
    ? factory.createArrayDocumentState()
    : isObject(json)
      ? factory.createObjectDocumentState()
      : json !== undefined
        ? factory.createValueDocumentState()
        : undefined
}

export type CreateDocumentStateProps = {
  json: unknown | undefined
  expand?: OnExpand
}

export function createDocumentState({
  json,
  expand
}: CreateDocumentStateProps): DocumentState | undefined {
  const documentState: DocumentState | undefined = createRecursiveState({
    json,
    factory: documentStateFactory
  }) as DocumentState

  return expand && documentState ? expandPath(json, documentState, [], expand) : documentState
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

export const documentStateFactory: RecursiveStateFactory = {
  createObjectDocumentState,
  createArrayDocumentState,
  createValueDocumentState
}

export function ensureRecursiveState<T extends RecursiveState>(
  json: unknown,
  documentState: T | undefined,
  path: JSONPath,
  {
    createObjectDocumentState,
    createArrayDocumentState,
    createValueDocumentState
  }: RecursiveStateFactory
): T {
  function recurse(value: unknown, state: T | undefined, path: JSONPath): T {
    if (Array.isArray(value)) {
      const arrayState: ArrayRecursiveState = isArrayRecursiveState(state)
        ? state
        : createArrayDocumentState()
      if (path.length === 0) {
        return arrayState as T
      }

      const index = int(path[0])
      const itemState = recurse(value[index], arrayState.items[index] as T, path.slice(1))
      return setIn(arrayState, ['items', path[0]], itemState)
    }

    if (isObject(value)) {
      const objectState = isObjectRecursiveState(state) ? state : createObjectDocumentState()
      if (path.length === 0) {
        return objectState as T
      }

      const key = path[0]
      const itemState = recurse(value[key], objectState.properties[key] as T, path.slice(1))
      return setIn(objectState, ['properties', key], itemState)
    }

    return isValueRecursiveState(state) ? state : (createValueDocumentState() as T)
  }

  return recurse(json, documentState, path)
}

export function syncDocumentState(
  json: unknown,
  documentState: DocumentState | undefined,
  path: JSONPath = []
): DocumentState | undefined {
  return _transformDocumentState(
    json,
    documentState,
    path,
    (nestedJson, nestedState) => {
      if (nestedJson === undefined || nestedState === undefined) {
        return undefined
      }

      if (Array.isArray(nestedJson)) {
        if (isArrayRecursiveState(nestedState)) {
          return nestedState
        }

        const expanded = isExpandableState(nestedState) ? nestedState.expanded : false
        return createArrayDocumentState({ expanded })
      }

      if (isObject(nestedJson)) {
        if (isObjectRecursiveState(nestedState)) {
          return nestedState
        }

        const expanded = isExpandableState(nestedState) ? nestedState.expanded : false
        return createObjectDocumentState({ expanded })
      }

      // json is of type value
      if (isValueRecursiveState(nestedState)) {
        return nestedState
      }

      // type of state does not match the actual type of the json
      return undefined
    },
    () => true
  )
}

function _transformDocumentState(
  json: unknown,
  documentState: DocumentState | undefined,
  path: JSONPath,
  callback: (
    nestedJson: unknown,
    nestedState: DocumentState | undefined,
    path: JSONPath
  ) => DocumentState | undefined,
  recurse: (nestedState: DocumentState | undefined) => boolean
): DocumentState | undefined {
  const updatedState = callback(json, documentState, path)

  if (Array.isArray(json) && isArrayRecursiveState(updatedState) && recurse(updatedState)) {
    const items: (DocumentState | undefined)[] = []

    forEachVisibleIndex(json, updatedState.visibleSections, (index) => {
      const itemPath = path.concat(String(index))
      const value = json[index]
      const item = updatedState.items[index]
      const updatedItem = _transformDocumentState(value, item, itemPath, callback, recurse)
      if (updatedItem !== undefined) {
        items[index] = updatedItem
      }
    })

    const changed = !strictShallowEqual(items, updatedState.items)

    return changed ? { ...updatedState, items } : updatedState
  }

  if (isObject(json) && isObjectRecursiveState(updatedState) && recurse(updatedState)) {
    const properties: ObjectDocumentState['properties'] = {}
    Object.keys(json).forEach((key) => {
      const propPath = path.concat(key)
      const value = json[key]
      const prop = updatedState.properties[key]
      const updatedProp = _transformDocumentState(value, prop, propPath, callback, recurse)
      if (updatedProp !== undefined) {
        properties[key] = updatedProp
      }
    })

    const changed = !strictShallowEqual(
      Object.values(properties),
      Object.values(updatedState.properties)
    )

    return changed ? { ...updatedState, properties } : updatedState
  }

  return updatedState
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

export function expandVisibleSection(state: ArrayDocumentState, index: number): ArrayDocumentState {
  if (inVisibleSection(state.visibleSections, index)) {
    return state
  }

  const start = currentRoundNumber(index)
  const end = nextRoundNumber(start)
  const newVisibleSection = { start, end }

  return {
    ...state,
    visibleSections: mergeSections(state.visibleSections.concat(newVisibleSection))
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
      value = value[int(index)]
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
 * Expand all nodes along the given path, and expand invisible array sections if needed.
 * Then, optionally expand child nodes according to the provided callback.
 */
export function expandPath(
  json: unknown | undefined,
  documentState: DocumentState | undefined,
  path: JSONPath,
  callback: OnExpand
): DocumentState | undefined {
  let updatedState = documentState

  // Step 1: expand all nodes along the path, and update visibleSections if needed
  for (let i = 0; i < path.length; i++) {
    const partialPath = path.slice(0, i)

    updatedState = updateInDocumentState(json, updatedState, partialPath, (_, nestedState) => {
      const updatedState =
        isExpandableState(nestedState) && !nestedState.expanded
          ? { ...nestedState, expanded: true }
          : nestedState

      if (isArrayRecursiveState(updatedState)) {
        const index = int(path[i])
        return expandVisibleSection(updatedState, index)
      }

      return updatedState
    })
  }

  // Step 2: recursively expand child nodes tested with the callback
  return updateInDocumentState(json, updatedState, path, (nestedValue, nestedState) => {
    const relativePath: JSONPath = []
    return _expandRecursively(nestedValue, nestedState, relativePath, callback)
  })
}

function _expandRecursively(
  json: unknown,
  documentState: DocumentState | undefined,
  path: JSONPath,
  callback: OnExpand
): DocumentState | undefined {
  return _transformDocumentState(
    json,
    documentState,
    path,
    (nestedJson, nestedState, nestedPath) => {
      if (Array.isArray(nestedJson) && callback(nestedPath)) {
        return isArrayRecursiveState(nestedState)
          ? nestedState.expanded
            ? nestedState
            : { ...nestedState, expanded: true }
          : createArrayDocumentState({ expanded: true })
      }

      if (isObject(nestedJson) && callback(nestedPath)) {
        return isObjectRecursiveState(nestedState)
          ? nestedState.expanded
            ? nestedState
            : { ...nestedState, expanded: true }
          : createObjectDocumentState({ expanded: true })
      }

      return nestedState
    },
    (nestedState) => isExpandableState(nestedState) && nestedState.expanded
  )
}

export function collapsePath(
  json: unknown,
  documentState: DocumentState | undefined,
  path: JSONPath,
  recursive: boolean
): DocumentState | undefined {
  return updateInDocumentState(json, documentState, path, (nestedJson, nestedState) => {
    return recursive ? _collapseRecursively(nestedJson, nestedState, path) : _collapse(nestedState)
  })
}

function _collapse<T extends DocumentState | undefined>(documentState: T): T {
  if (isArrayRecursiveState(documentState) && documentState.expanded) {
    return { ...documentState, expanded: false, visibleSections: DEFAULT_VISIBLE_SECTIONS }
  }

  if (isObjectRecursiveState(documentState) && documentState.expanded) {
    return { ...documentState, expanded: false }
  }

  return documentState
}

function _collapseRecursively(
  json: unknown,
  documentState: DocumentState | undefined,
  path: JSONPath
): DocumentState | undefined {
  return _transformDocumentState(
    json,
    documentState,
    path,
    (_, nestedState) => _collapse(nestedState),
    () => true
  )
}

/**
 * Expand a section of items in an array
 */
export function expandSection(
  json: unknown,
  documentState: DocumentState | undefined,
  path: JSONPath,
  section: Section
): DocumentState | undefined {
  return updateInDocumentState(json, documentState, path, (_value, state) => {
    if (!isArrayRecursiveState(state)) {
      return state
    }

    const visibleSections = mergeSections(state.visibleSections.concat(section))

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
  documentState: DocumentState | undefined,
  operations: JSONPatchDocument
): { json: unknown; documentState: DocumentState | undefined } {
  const initial = { json, documentState }

  const result = operations.reduce((current, operation) => {
    return {
      json: immutableJSONPatch(current.json, [operation]),
      documentState: _documentStatePatch(current.json, current.documentState, operation)
    }
  }, initial)

  return {
    json: result.json,
    documentState: syncDocumentState(result.json, result.documentState) // sync to clean up leftover state
  }
}

function _documentStatePatch(
  json: unknown,
  documentState: DocumentState | undefined,
  operation: JSONPatchOperation
): DocumentState | undefined {
  if (isJSONPatchAdd(operation)) {
    return documentStateAdd(json, documentState, operation, undefined)
  }

  if (isJSONPatchRemove(operation)) {
    return documentStateRemove(json, documentState, operation)
  }

  if (isJSONPatchReplace(operation)) {
    const path = parsePath(json, operation.path)
    const enforceString = getEnforceString(json, documentState, path)
    if (enforceString) {
      // ensure the enforceString setting is not lost when for example changing "123"
      // into "abc" and later back to "123", so we now make it explicit.
      return setInDocumentState(json, documentState, path, { type: 'value', enforceString })
    }

    // nothing special to do (all is handled by syncDocumentState)
    return documentState
  }

  if (isJSONPatchCopy(operation) || isJSONPatchMove(operation)) {
    return documentStateMoveOrCopy(json, documentState, operation)
  }

  return documentState
}

export function getInRecursiveState<T extends RecursiveState>(
  json: unknown,
  documentState: T | undefined,
  path: JSONPath
): T | undefined {
  try {
    return getIn(documentState, toRecursiveStatePath(json, path))
  } catch {
    return undefined
  }
}

export function setInRecursiveState<T extends RecursiveState>(
  json: unknown,
  recursiveState: T | undefined,
  path: JSONPath,
  value: unknown,
  factory: RecursiveStateFactory
): T | undefined {
  const ensuredState = ensureRecursiveState(json, recursiveState, path, factory)
  return setIn(ensuredState, toRecursiveStatePath(json, path), value)
}

export function updateInRecursiveState<T extends RecursiveState>(
  json: unknown,
  documentState: T | undefined,
  path: JSONPath,
  transform: (value: unknown, state: T) => T | undefined,
  factory: RecursiveStateFactory
): T {
  const ensuredState: T = ensureRecursiveState(json, documentState, path, factory)
  return updateIn(ensuredState, toRecursiveStatePath(json, path), (nestedState: T) => {
    const value = getIn(json, path)
    return transform(value, nestedState)
  })
}

export function setInDocumentState<T extends RecursiveState>(
  json: unknown | undefined,
  documentState: T | undefined,
  path: JSONPath,
  value: unknown
): T | undefined {
  return setInRecursiveState(json, documentState, path, value, documentStateFactory)
}

export function updateInDocumentState<T extends RecursiveState>(
  json: unknown | undefined,
  documentState: T | undefined,
  path: JSONPath,
  transform: (value: unknown, state: T) => T | undefined
): T {
  return updateInRecursiveState(json, documentState, path, transform, documentStateFactory)
}

export function deleteInDocumentState<T extends RecursiveState>(
  json: unknown | undefined,
  documentState: T | undefined,
  path: JSONPath
): T | undefined {
  const recursivePath = toRecursiveStatePath(json, path)

  return existsIn(documentState, recursivePath)
    ? deleteIn(documentState, toRecursiveStatePath(json, path))
    : documentState
}

export function documentStateAdd(
  json: unknown,
  documentState: DocumentState | undefined,
  operation: JSONPatchAdd,
  stateValue: DocumentState | undefined
): DocumentState | undefined {
  const path = parsePath(json, operation.path)
  const parentPath = initial(path)

  let updatedState = documentState

  updatedState = updateInDocumentState(json, updatedState, parentPath, (_parent, arrayState) => {
    if (!isArrayRecursiveState(arrayState)) {
      return arrayState
    }

    const index = int(last(path) as string)
    const { items, visibleSections } = arrayState
    return {
      ...arrayState,
      items:
        index < items.length
          ? insertItemsAt(items, index, stateValue !== undefined ? [stateValue] : Array(1))
          : items,
      visibleSections: shiftVisibleSections(visibleSections, index, 1)
    }
  })

  // object property added, nothing to do
  return setInDocumentState(json, updatedState, path, stateValue)
}

export function documentStateRemove(
  json: unknown,
  documentState: DocumentState | undefined,
  operation: JSONPatchRemove
): DocumentState | undefined {
  const path = parsePath(json, operation.path)
  const parentPath = initial(path)
  const parent = getIn(json, parentPath)

  if (Array.isArray(parent)) {
    return updateInDocumentState(json, documentState, parentPath, (_parent, arrayState) => {
      if (!isArrayRecursiveState(arrayState)) {
        return arrayState
      }

      const index = int(last(path) as string)
      const { items, visibleSections } = arrayState

      return {
        ...arrayState,
        items: items.slice(0, index).concat(items.slice(index + 1)),
        visibleSections: shiftVisibleSections(visibleSections, index, -1)
      }
    })
  }

  return deleteInDocumentState(json, documentState, path)
}

export function documentStateMoveOrCopy(
  json: unknown,
  documentState: DocumentState | undefined,
  operation: JSONPatchCopy | JSONPatchMove
): DocumentState | undefined {
  if (isJSONPatchMove(operation) && operation.from === operation.path) {
    // nothing to do
    return documentState
  }

  let updatedState = documentState

  // get the state that we will move or copy
  const from = parsePath(json, operation.from)
  const stateValue = getInRecursiveState(json, updatedState, from)

  if (isJSONPatchMove(operation)) {
    updatedState = documentStateRemove(json, updatedState, {
      op: 'remove',
      path: operation.from
    })
  }

  updatedState = documentStateAdd(
    json,
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
  path: JSONPath
): boolean {
  const value = getIn(json, path)
  const nestedState = getInRecursiveState(json, documentState, path)
  const enforceString = isValueRecursiveState(nestedState) ? nestedState.enforceString : undefined

  if (typeof enforceString === 'boolean') {
    return enforceString
  }

  return isStringContainingPrimitiveValue(value)
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
export function getVisiblePaths(
  json: unknown,
  documentState: DocumentState | undefined
): JSONPath[] {
  const paths: JSONPath[] = []

  function _recurse(value: unknown, state: DocumentState | undefined, path: JSONPath) {
    paths.push(path)

    if (isJSONArray(value) && isArrayRecursiveState(state) && state.expanded) {
      forEachVisibleIndex(value, state.visibleSections, (index) => {
        _recurse(value[index], state.items[index], path.concat(String(index)))
      })
    }

    if (isJSONObject(value) && isObjectRecursiveState(state) && state.expanded) {
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
  documentState: DocumentState | undefined,
  includeInside = true
): CaretPosition[] {
  const paths: CaretPosition[] = []

  function _recurse(value: unknown, path: JSONPath) {
    paths.push({ path, type: CaretType.value })

    const valueState = getInRecursiveState(json, documentState, path)
    if (value && isExpandableState(valueState) && valueState.expanded) {
      if (includeInside) {
        paths.push({ path, type: CaretType.inside })
      }

      if (isJSONArray(value)) {
        const visibleSections = isArrayRecursiveState(valueState)
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
  documentState: DocumentState | undefined,
  path: JSONPath
): JSONPath | undefined {
  const visiblePaths = getVisiblePaths(json, documentState)
  const visiblePathPointers = visiblePaths.map(compileJSONPointer)
  const pathPointer = compileJSONPointer(path)
  const index = visiblePathPointers.indexOf(pathPointer)

  if (index !== -1 && index > 0) {
    return visiblePaths[index - 1]
  }

  return undefined
}

/**
 * Find the next visible path.
 * This can be the next parent entry.
 */
// TODO: write tests for getNextVisiblePath
export function getNextVisiblePath(
  json: unknown,
  documentState: DocumentState | undefined,
  path: JSONPath
): JSONPath | undefined {
  const visiblePaths = getVisiblePaths(json, documentState)
  const visiblePathPointers = visiblePaths.map(compileJSONPointer)
  const index = visiblePathPointers.indexOf(compileJSONPointer(path))

  if (index !== -1 && index < visiblePaths.length - 1) {
    return visiblePaths[index + 1]
  }

  return undefined
}

/**
 * Expand recursively when the expanded contents is small enough,
 * else expand in a minimalistic way
 */
export function expandSmart(
  json: unknown | undefined,
  documentState: DocumentState | undefined,
  path: JSONPath,
  maxSize: number = MAX_DOCUMENT_SIZE_EXPAND_ALL
): DocumentState | undefined {
  const nestedJson = getIn(json, path)
  const callback = isLargeContent({ json: nestedJson }, maxSize) ? expandMinimal : expandAll

  return expandPath(json, documentState, path, callback)
}

export function expandSmartIfCollapsed(
  json: unknown | undefined,
  documentState: DocumentState | undefined,
  path: JSONPath
) {
  const nestedState = getInRecursiveState(json, documentState, path)
  const isExpanded = isExpandableState(nestedState) ? nestedState.expanded : false

  return isExpanded ? documentState : expandSmart(json, documentState, path)
}

/**
 * Expand the root array or object, and in case of an array, expand the first array item
 */
export function expandMinimal(relativePath: JSONPath): boolean {
  // first item of an array
  return relativePath.length === 0 ? true : relativePath.length === 1 && relativePath[0] === '0'
}

/**
 * Expand the root array or object
 */
export function expandSelf(relativePath: JSONPath): boolean {
  return relativePath.length === 0
}

export function expandAll(): boolean {
  return true
}

export function expandNone(): boolean {
  return false
}
