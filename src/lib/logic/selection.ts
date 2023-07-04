import {
  getIn,
  isJSONArray,
  isJSONObject,
  isJSONPatchCopy,
  isJSONPatchMove,
  type JSONPatchDocument,
  type JSONPatchOperation,
  type JSONPath,
  type JSONValue,
  parsePath
} from 'immutable-json-patch'
import { first, initial, isEmpty, isEqual, last } from 'lodash-es'
import { isObjectOrArray } from '$lib/utils/typeUtils.js'
import {
  collapsePath,
  getNextVisiblePath,
  getPreviousVisiblePath,
  getVisibleCaretPositions,
  getVisiblePaths
} from './documentState.js'
import type {
  AfterSelection,
  CaretPosition,
  DocumentState,
  InsideSelection,
  JSONParser,
  JSONSelection,
  KeySelection,
  MultiSelection,
  ValueSelection
} from '../types.js'
import { CaretType, SelectionType } from '$lib/types.js'
import { int } from '$lib/utils/numberUtils.js'

export function isAfterSelection(
  selection: JSONSelection | undefined
): selection is AfterSelection {
  return (selection && selection.type === SelectionType.after) || false
}

export function isInsideSelection(
  selection: JSONSelection | undefined
): selection is InsideSelection {
  return (selection && selection.type === SelectionType.inside) || false
}

export function isKeySelection(selection: JSONSelection | undefined): selection is KeySelection {
  return (selection && selection.type === SelectionType.key) || false
}

export function isValueSelection(
  selection: JSONSelection | undefined
): selection is ValueSelection {
  return (selection && selection.type === SelectionType.value) || false
}

export function isMultiSelection(
  selection: JSONSelection | undefined
): selection is MultiSelection {
  return (selection && selection.type === SelectionType.multi) || false
}

export function isMultiSelectionWithOneItem(selection: JSONSelection | undefined): boolean {
  return isMultiSelection(selection) && selection.focusPath === selection.anchorPath
}

/**
 * Expand a selection start and end into an array containing all paths
 * between (and including) start and end
 */
export function getSelectionPaths(json: JSONValue, selection: JSONSelection): JSONPath[] {
  const paths: JSONPath[] = []

  iterateOverSelection(json, selection, (path) => {
    paths.push(path)
  })

  return paths
}

export function selectionMatchesPredicate(
  json: JSONValue | undefined,
  selection: JSONSelection | undefined,
  predicate: (path: JSONPath) => boolean
): boolean {
  return (
    iterateOverSelection(json, selection, (selectionPath) => {
      if (predicate(selectionPath)) {
        return true
      }
    }) || false
  )
}

/**
 * Expand a selection start and end into an array containing all paths
 * between (and including) start and end.
 *
 * The function iterates always from start to end, independent of the order
 * of focusPath and anchorPath.
 *
 * When the callback returns something other than undefined, the iteration is
 * canceled and the value returned by the callback is returned by iterateOverSelection.
 */
export function iterateOverSelection<T>(
  json: JSONValue | undefined,
  selection: JSONSelection | undefined,
  callback: (path: JSONPath) => void | undefined | T
): void | undefined | T {
  if (!selection) {
    return undefined
  }

  const anchorPath = getAnchorPath(selection)
  const focusPath = getFocusPath(selection)

  if (isEqual(anchorPath, focusPath)) {
    // just a single node
    return callback(anchorPath)
  } else {
    // multiple nodes
    const sharedPath = findSharedPath(anchorPath, focusPath)

    if (anchorPath.length === sharedPath.length || focusPath.length === sharedPath.length) {
      // a parent and a child, like ['arr', 1] and ['arr']
      return callback(sharedPath)
    }

    if (!json) {
      return undefined
    }

    const anchorKey = anchorPath[sharedPath.length]
    const focusKey = focusPath[sharedPath.length]
    const value = getIn(json, sharedPath)

    if (isJSONObject(value)) {
      const keys = Object.keys(value)
      const anchorIndex = keys.indexOf(anchorKey)
      const focusIndex = keys.indexOf(focusKey)

      if (anchorIndex !== -1 && focusIndex !== -1) {
        const startIndex = Math.min(anchorIndex, focusIndex)
        const endIndex = Math.max(anchorIndex, focusIndex)

        for (let i = startIndex; i <= endIndex; i++) {
          const value = callback(sharedPath.concat(keys[i]))
          if (value !== undefined) {
            return value
          }
        }

        return undefined
      }
    }

    if (isJSONArray(value)) {
      const startIndex = Math.min(int(anchorKey), int(focusKey))
      const endIndex = Math.max(int(anchorKey), int(focusKey))

      for (let i = startIndex; i <= endIndex; i++) {
        const value = callback(sharedPath.concat(String(i)))
        if (value !== undefined) {
          return value
        }
      }

      return undefined
    }
  }

  throw new Error('Failed to create selection')
}

export function getParentPath(selection: JSONSelection): JSONPath {
  if (isInsideSelection(selection)) {
    return selection.focusPath
  } else {
    return initial(selection.focusPath)
  }
}

export function getStartPath(json: JSONValue, selection: JSONSelection): JSONPath {
  return (
    iterateOverSelection(json, selection, (selectionPath) => {
      // we directly return the first selection path
      return selectionPath
    }) || selection.focusPath
  )
}

export function getEndPath(json: JSONValue, selection: JSONSelection): JSONPath {
  const startPath = getStartPath(json, selection)

  return isEqual(startPath, selection.focusPath) ? selection.anchorPath : selection.focusPath
}

// TODO: write unit test
export function isSelectionInsidePath(selection: JSONSelection, path: JSONPath): boolean {
  return (
    pathStartsWith(selection.focusPath, path) &&
    (selection.focusPath.length > path.length || isInsideSelection(selection))
  )
}

// TODO: write unit test
export function isPathInsideSelection(
  json: JSONValue | undefined,
  selection: JSONSelection | undefined,
  path: JSONPath,
  anchorType: string
): boolean {
  if (!selection || !json) {
    return false
  }

  if (isMultiSelection(selection)) {
    return selectionMatchesPredicate(json, selection, (selectionPath) =>
      pathStartsWith(path, selectionPath)
    )
  }

  if (isKeySelection(selection)) {
    return anchorType === SelectionType.key && isEqual(selection.focusPath, path)
  }

  if (isValueSelection(selection)) {
    if (anchorType === SelectionType.value && isEqual(selection.focusPath, path)) {
      return true
    }

    if (
      pathStartsWith(path, selection.focusPath) &&
      path.length > selection.focusPath.length &&
      (anchorType === SelectionType.key ||
        anchorType === SelectionType.value ||
        anchorType === SelectionType.multi)
    ) {
      return true
    }
  }

  return false
}

export function getSelectionUp(
  json: JSONValue,
  documentState: DocumentState,
  keepAnchorPath = false,
  useFocusPath = false
): JSONSelection | null {
  const selection = documentState.selection
  if (!selection) {
    return null
  }

  const path = useFocusPath ? selection.focusPath : getStartPath(json, selection)
  const previousPath = getPreviousVisiblePath(json, documentState, path)

  if (previousPath === null) {
    return null
  }

  const anchorPath = previousPath
  const focusPath = previousPath

  if (keepAnchorPath) {
    // multi selection
    if (isAfterSelection(selection) || isInsideSelection(selection)) {
      return createMultiSelection(json, selection.anchorPath, selection.anchorPath)
    }

    return createMultiSelection(json, selection.anchorPath, focusPath)
  }

  if (isKeySelection(selection)) {
    const parentPath = initial(previousPath)
    const parent = getIn(json, parentPath)
    if (Array.isArray(parent) || isEmpty(previousPath)) {
      // switch to value selection: array has no keys, and root object also not
      return createValueSelection(previousPath, false)
    } else {
      return createKeySelection(previousPath, false)
    }
  }

  if (isValueSelection(selection)) {
    return createValueSelection(previousPath, false)
  }

  if (isAfterSelection(selection)) {
    // select the node itself, not the previous node,
    // FIXME: when after an expanded object/array, should go to the last item inside the object/array
    return createMultiSelection(json, path, path)
  }

  if (isInsideSelection(selection)) {
    // select the node itself, not the previous node,
    return createMultiSelection(json, path, path)
  }

  // multi selection -> select previous node
  return createMultiSelection(json, anchorPath, focusPath)
}

export function getSelectionDown(
  json: JSONValue,
  documentState: DocumentState,
  keepAnchorPath = false,
  useFocusPath = false
): JSONSelection | null {
  const selection = documentState.selection
  if (!selection) {
    return null
  }
  // TODO: this function is too large, break it down in two separate functions: one for keepAnchorPath = true, and one for keepAnchorPath = false?
  const path = useFocusPath ? selection.focusPath : getEndPath(json, selection)
  const nextPath = getNextVisiblePath(json, documentState, path)
  const anchorPath = nextPath
  const focusPath = nextPath

  if (nextPath === null || anchorPath == null || focusPath == null) {
    return null
  }

  if (keepAnchorPath) {
    // if the focusPath is an Array or object, we must not step into it but
    // over it, we pass state with this array/object collapsed
    const collapsedState = isObjectOrArray(getIn(json, path))
      ? collapsePath(documentState, path)
      : documentState

    const nextPathAfter = getNextVisiblePath(json, collapsedState, path)

    // multi selection
    if (nextPathAfter === null) {
      return null
    }

    if (isAfterSelection(selection)) {
      return createMultiSelection(json, nextPathAfter, nextPathAfter)
    }

    if (isInsideSelection(selection)) {
      return createMultiSelection(json, anchorPath, focusPath)
    }

    return createMultiSelection(json, selection.anchorPath, nextPathAfter)
  }

  if (isKeySelection(selection)) {
    const parentPath = initial(nextPath)
    const parent = getIn(json, parentPath)
    if (Array.isArray(parent)) {
      // switch to value selection: array has no keys
      return createValueSelection(focusPath, false)
    } else {
      return createKeySelection(focusPath, false)
    }
  }

  if (isValueSelection(selection)) {
    return createValueSelection(focusPath, false)
  }

  // TODO: simplify, this is redundant, same as next
  if (isInsideSelection(selection)) {
    return createMultiSelection(json, anchorPath, focusPath)
  }

  // selection type MULTI or AFTER
  return createMultiSelection(json, nextPath, nextPath)
}

/**
 * Get the next selection for a value inside the current object/array
 * If there is no next value, select AFTER.
 * Only applicable for ValueSelection
 */
export function getSelectionNextInside(
  json: JSONValue,
  documentState: DocumentState,
  path: JSONPath
): JSONSelection | null {
  // TODO: write unit tests for getSelectionNextInside
  const parentPath = initial(path)
  const childPath = [last(path) as string]

  const parent = getIn(json, parentPath)
  const nextPathInside = parent ? getNextVisiblePath(parent, documentState, childPath) : undefined

  if (nextPathInside) {
    return createValueSelection(parentPath.concat(nextPathInside), false)
  } else {
    return createAfterSelection(path)
  }
}

/**
 * Find the caret position and its siblings for a given selection
 */
// TODO: unit test
export function findCaretAndSiblings(
  json: JSONValue,
  documentState: DocumentState,
  includeInside: boolean
): { next: CaretPosition | null; caret: CaretPosition | null; previous: CaretPosition | null } {
  const selection = documentState.selection
  if (!selection) {
    return { caret: null, previous: null, next: null }
  }
  const visibleCaretPositions = getVisibleCaretPositions(json, documentState, includeInside)

  const index = visibleCaretPositions.findIndex((caret) => {
    return isEqual(caret.path, selection.focusPath) && String(caret.type) === String(selection.type)
  })

  return {
    caret: index !== -1 ? visibleCaretPositions[index] : null,

    previous: index !== -1 && index > 0 ? visibleCaretPositions[index - 1] : null,

    next:
      index !== -1 && index < visibleCaretPositions.length - 1
        ? visibleCaretPositions[index + 1]
        : null
  }
}

export function getSelectionLeft(
  json: JSONValue,
  documentState: DocumentState,
  keepAnchorPath = false,
  includeInside = true
): JSONSelection | null {
  const selection = documentState.selection
  if (!selection) {
    return null
  }

  const { caret, previous } = findCaretAndSiblings(json, documentState, includeInside)

  if (keepAnchorPath) {
    if (!isMultiSelection(selection)) {
      return createMultiSelection(json, selection.anchorPath, selection.focusPath)
    }

    return null
  }

  if (caret && previous) {
    return fromCaretPosition(previous)
  }

  const parentPath = initial(selection.focusPath)
  const parent = getIn(json, parentPath)

  if (isValueSelection(selection) && Array.isArray(parent)) {
    return createMultiSelection(json, selection.focusPath, selection.focusPath)
  }

  if (isMultiSelection(selection) && !Array.isArray(parent)) {
    return createKeySelection(selection.focusPath, false)
  }

  return null
}

export function getSelectionRight(
  json: JSONValue,
  documentState: DocumentState,
  keepAnchorPath = false,
  includeInside = true
): JSONSelection | null {
  const selection = documentState.selection
  if (!selection) {
    return null
  }

  const { caret, next } = findCaretAndSiblings(json, documentState, includeInside)

  if (keepAnchorPath) {
    if (!isMultiSelection(selection)) {
      return createMultiSelection(json, selection.anchorPath, selection.focusPath)
    }

    return null
  }

  if (caret && next) {
    return fromCaretPosition(next)
  }

  if (isMultiSelection(selection)) {
    return createValueSelection(selection.focusPath, false)
  }

  return null
}

/**
 * Get a proper initial selection based on what is visible
 */
export function getInitialSelection(json: JSONValue, documentState: DocumentState): JSONSelection {
  const visiblePaths = getVisiblePaths(json, documentState)

  // find the first, deepest nested entry (normally a value, not an Object/Array)
  let index = 0
  while (
    index < visiblePaths.length - 1 &&
    visiblePaths[index + 1].length > visiblePaths[index].length
  ) {
    index++
  }

  const path = visiblePaths[index]
  return path.length === 0 || Array.isArray(getIn(json, initial(path)))
    ? createValueSelection(path, false) // Array items and root object/array do not have a key, so select value in that case
    : createKeySelection(path, false)
}

export function createSelectionFromOperations(
  json: JSONValue,
  operations: JSONPatchDocument
): JSONSelection | undefined {
  if (operations.length === 1) {
    const operation = first(operations) as JSONPatchOperation
    if (operation.op === 'replace' || operation.op === 'move') {
      // replaced value
      const path = parsePath(json, operation.path)

      return createValueSelection(path, false)
    }
  }

  if (!isEmpty(operations) && operations.every((operation) => operation.op === 'move')) {
    const firstOp = first(operations)
    const otherOps = operations.slice(1)

    if (
      (isJSONPatchCopy(firstOp) || isJSONPatchMove(firstOp)) &&
      firstOp.from !== firstOp.path &&
      otherOps.every((op) => (isJSONPatchCopy(op) || isJSONPatchMove(op)) && op.from === op.path)
    ) {
      // a renamed key
      const path = parsePath(json, firstOp.path)

      return createKeySelection(path, false)
    }
  }

  const paths = operations
    .filter((operation) => {
      return (
        operation.op !== 'test' &&
        operation.op !== 'remove' &&
        (operation.op !== 'move' || operation.from !== operation.path) &&
        typeof operation.path === 'string'
      )
    })
    .map((operation) => parsePath(json, operation.path))

  if (isEmpty(paths)) {
    return undefined
  }

  // TODO: make this function robust against operations which do not have consecutive paths or have wrongly ordered paths

  return {
    type: SelectionType.multi,
    paths,
    anchorPath: first(paths) as JSONPath,
    focusPath: last(paths) as JSONPath
  }
}

/**
 * Find the common path of two paths.
 * For example findCommonRoot(['arr', '1', 'name'], ['arr', '1', 'address', 'contact']) returns ['arr', '1']
 */
// TODO: write unit tests for findSharedPath
export function findSharedPath(path1: JSONPath, path2: JSONPath): JSONPath {
  let i = 0
  while (i < path1.length && i < path2.length && path1[i] === path2[i]) {
    i++
  }

  return path1.slice(0, i)
}

export function singleItemSelected(selection: JSONSelection | undefined): boolean {
  return (
    isKeySelection(selection) ||
    isValueSelection(selection) ||
    isMultiSelectionWithOneItem(selection)
  )
}

export function findRootPath(json: JSONValue, selection: JSONSelection): JSONPath {
  return singleItemSelected(selection) && isObjectOrArray(getIn(json, selection.focusPath))
    ? selection.focusPath
    : initial(selection.focusPath) // the parent path of the paths
}

// TODO: unit test
export function pathStartsWith(path: JSONPath, parentPath: JSONPath): boolean {
  if (path.length < parentPath.length) {
    return false
  }

  for (let i = 0; i < parentPath.length; i++) {
    if (path[i] !== parentPath[i]) {
      return false
    }
  }

  return true
}

// TODO: write unit tests
export function removeEditModeFromSelection(documentState: DocumentState): DocumentState {
  const selection = documentState.selection

  if ((isKeySelection(selection) || isValueSelection(selection)) && selection.edit) {
    return {
      ...documentState,
      selection: {
        ...selection,
        edit: false
      }
    }
  }

  return documentState
}

export function createKeySelection(path: JSONPath, edit: boolean): KeySelection {
  return {
    type: SelectionType.key,
    anchorPath: path,
    focusPath: path,
    edit
  }
}

export function createValueSelection(path: JSONPath, edit: boolean): ValueSelection {
  return {
    type: SelectionType.value,
    anchorPath: path,
    focusPath: path,
    edit
  }
}

export function createInsideSelection(path: JSONPath): InsideSelection {
  return {
    type: SelectionType.inside,
    anchorPath: path,
    focusPath: path
  }
}

export function createAfterSelection(path: JSONPath): AfterSelection {
  return {
    type: SelectionType.after,
    anchorPath: path,
    focusPath: path
  }
}

export function createMultiSelection(
  json: JSONValue,
  anchorPath: JSONPath,
  focusPath: JSONPath
): MultiSelection {
  // FIXME: remove expanding selection upfront
  const paths = getSelectionPaths(json, { type: SelectionType.multi, anchorPath, focusPath })

  // the original anchorPath or focusPath may be somewhere inside the
  // returned paths: when one of the two paths is inside an object and the
  // other is outside. Then the selection is enlarged to span the whole object.
  const focusPathLast =
    pathStartsWith(focusPath, last(paths) as JSONPath) ||
    pathStartsWith(anchorPath, first(paths) as JSONPath)

  return {
    type: SelectionType.multi,
    anchorPath: focusPathLast ? (first(paths) as JSONPath) : (last(paths) as JSONPath),
    focusPath: focusPathLast ? (last(paths) as JSONPath) : (first(paths) as JSONPath),
    paths
  }
}

/**
 * Turn selected contents into plain text partial JSON, usable for copying to
 * clipboard for example.
 */
export function selectionToPartialJson(
  json: JSONValue,
  selection: JSONSelection | undefined,
  indentation: number | string | undefined,
  parser: JSONParser
): string | null {
  if (isKeySelection(selection)) {
    return String(last(selection.focusPath))
  }

  if (isValueSelection(selection)) {
    const value = getIn(json, selection.focusPath)
    return typeof value === 'string' ? value : parser.stringify(value, null, indentation) // TODO: customizable indentation?
  }

  if (isMultiSelection(selection)) {
    if (isEmpty(selection.focusPath)) {
      // root object -> does not have a parent key/index
      return parser.stringify(json, null, indentation)
    }

    const parentPath = getParentPath(selection)
    const parent = getIn(json, parentPath)
    if (Array.isArray(parent)) {
      if (isMultiSelectionWithOneItem(selection)) {
        // do not suffix a single selected array item with a comma
        const item = getIn(json, selection.focusPath)
        return parser.stringify(item, null, indentation)
      } else {
        return getSelectionPaths(json, selection)
          .map((path) => {
            const item = getIn(json, path)
            return `${parser.stringify(item, null, indentation)},`
          })
          .join('\n')
      }
    } else {
      // parent is Object
      return getSelectionPaths(json, selection)
        .map((path) => {
          const key = last(path)
          const value = getIn(json, path)
          return `${parser.stringify(key)}: ${parser.stringify(value, null, indentation)},`
        })
        .join('\n')
    }
  }

  return null
}

export function isEditingSelection(selection: JSONSelection | undefined): boolean {
  return (
    selection !== undefined &&
    (isKeySelection(selection) || isValueSelection(selection)) &&
    selection.edit === true
  )
}

export function updateSelectionInDocumentState(
  documentState: DocumentState,
  selection: JSONSelection | undefined,
  replaceIfUndefined = true
): DocumentState {
  if (selection === undefined && !replaceIfUndefined) {
    return documentState
  }

  return {
    ...documentState,
    selection
  }
}

/**
 * Create a selection which selects the whole document
 */
// TODO: write unit tests
export function selectAll(): JSONSelection {
  return createValueSelection([], false)
}

// TODO: write unit tests
export function hasSelectionContents(selection: JSONSelection | undefined): boolean {
  return isKeySelection(selection) || isValueSelection(selection) || isMultiSelection(selection)
}

/**
 * Test whether the current selection can be converted.
 * That is the case when the selection is a key/value, or a multi selection with only one path
 */
export function canConvert(selection: JSONSelection): boolean {
  return (
    isKeySelection(selection) ||
    isValueSelection(selection) ||
    isMultiSelectionWithOneItem(selection)
  )
}

// TODO: unit test
export function fromCaretPosition(caretPosition: CaretPosition): JSONSelection {
  switch (caretPosition.type) {
    case CaretType.key:
      return createKeySelection(caretPosition.path, false)
    case CaretType.value:
      return createValueSelection(caretPosition.path, false)
    case CaretType.after:
      return createAfterSelection(caretPosition.path)
    case CaretType.inside:
      return createInsideSelection(caretPosition.path)
  }
}

// TODO: unit test
export function fromSelectionType(
  json: JSONValue,
  selectionType: SelectionType,
  path: JSONPath
): JSONSelection {
  switch (selectionType) {
    case SelectionType.key:
      return createKeySelection(path, false)
    case SelectionType.value:
      return createValueSelection(path, false)
    case SelectionType.after:
      return createAfterSelection(path)
    case SelectionType.inside:
      return createInsideSelection(path)
    case SelectionType.multi:
      return createMultiSelection(json, path, path)
  }
}

export function selectionIfOverlapping(
  json: JSONValue | undefined,
  selection: JSONSelection | undefined,
  path: JSONPath
): JSONSelection | undefined {
  if (!selection) {
    return undefined
  }

  const overlap = selectionMatchesPredicate(json, selection, (selectionPath) =>
    pathsOverlap(selectionPath, path)
  )

  return overlap ? selection : undefined
}

// TODO: write unit test
export function pathsOverlap(path1: JSONPath, path2: JSONPath): boolean {
  let i = 0
  const iMax = Math.min(path1.length, path2.length)

  while (path1[i] === path2[i] && i < iMax) {
    i++
  }

  return i === path1.length || i === path2.length
}

// TODO: write some unit tests
export function pathInSelection(
  json: JSONValue | undefined,
  selection: JSONSelection | undefined,
  path: JSONPath
): boolean {
  if (!selection || json === undefined) {
    return false
  }

  if (isEqual(selection.focusPath, path)) {
    // key, value, etc
    return true
  }

  if (isMultiSelectionWithOneItem(selection)) {
    return isEqual(selection.focusPath, path)
  }

  if (isMultiSelection(selection)) {
    return selectionMatchesPredicate(json, selection, (p) => isEqual(p, path))
  }

  return false
}

// TODO: write some unit tests
export function getFocusPath(selection: JSONSelection): JSONPath {
  // TODO: refactor
  return selection.focusPath
}

// TODO: write some unit tests
export function getAnchorPath(selection: JSONSelection): JSONPath {
  return isMultiSelection(selection) ? selection.anchorPath : selection.focusPath
}
