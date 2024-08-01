import {
  getIn,
  isJSONArray,
  isJSONObject,
  isJSONPatchCopy,
  isJSONPatchMove,
  type JSONPatchDocument,
  type JSONPatchOperation,
  type JSONPath,
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
  EditKeySelection,
  EditValueSelection,
  InsideSelection,
  JSONEditorSelection,
  JSONParser,
  JSONSelection,
  KeySelection,
  MultiSelection,
  TextSelection,
  ValueSelection
} from '../types.js'
import { CaretType, SelectionType } from '$lib/types.js'
import { int } from '$lib/utils/numberUtils.js'

export function isAfterSelection(
  selection: JSONEditorSelection | undefined
): selection is AfterSelection {
  return (selection && selection.type === SelectionType.after) || false
}

export function isInsideSelection(
  selection: JSONEditorSelection | undefined
): selection is InsideSelection {
  return (selection && selection.type === SelectionType.inside) || false
}

export function isKeySelection(
  selection: JSONEditorSelection | undefined
): selection is KeySelection {
  return (selection && selection.type === SelectionType.key) || false
}

export function isValueSelection(
  selection: JSONEditorSelection | undefined
): selection is ValueSelection {
  return (selection && selection.type === SelectionType.value) || false
}

export function isMultiSelection(
  selection: JSONEditorSelection | undefined
): selection is MultiSelection {
  return (selection && selection.type === SelectionType.multi) || false
}

export function isMultiSelectionWithOneItem(
  selection: JSONEditorSelection | undefined
): selection is MultiSelection {
  return isMultiSelection(selection) && isEqual(selection.focusPath, selection.anchorPath)
}

export function isJSONSelection(
  selection: JSONEditorSelection | undefined
): selection is JSONSelection {
  return (
    isMultiSelection(selection) ||
    isAfterSelection(selection) ||
    isInsideSelection(selection) ||
    isKeySelection(selection) ||
    isValueSelection(selection)
  )
}

export function isTextSelection(
  selection: JSONEditorSelection | undefined
): selection is TextSelection {
  return (selection && selection.type === SelectionType.text) || false
}

/**
 * Expand a selection start and end into an array containing all paths
 * between (and including) start and end
 */
export function getSelectionPaths(json: unknown, selection: JSONSelection): JSONPath[] {
  const paths: JSONPath[] = []

  iterateOverSelection(json, selection, (path) => {
    paths.push(path)
  })

  return paths
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
  json: unknown | undefined,
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
    if (json === undefined) {
      return undefined
    }

    const sharedPath = findSharedPath(anchorPath, focusPath)

    if (anchorPath.length === sharedPath.length || focusPath.length === sharedPath.length) {
      // a parent and a child, like ['arr', 1] and ['arr']
      return callback(sharedPath)
    }

    const selection = createMultiSelection(anchorPath, focusPath)
    const startPath = getStartPath(json, selection)
    const endPath = getEndPath(json, selection)

    const startIndex = getChildIndex(json, selection, startPath)
    const endIndex = getChildIndex(json, selection, endPath)

    if (startIndex === -1 || endIndex === -1) {
      return undefined
    }

    const value = getIn(json, sharedPath)

    if (isJSONObject(value)) {
      const keys = Object.keys(value)

      for (let i = startIndex; i <= endIndex; i++) {
        const value = callback(sharedPath.concat(keys[i]))
        if (value !== undefined) {
          return value
        }
      }

      return undefined
    }

    if (isJSONArray(value)) {
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
    return selection.path
  } else {
    return initial(getFocusPath(selection))
  }
}

export function getStartPath(json: unknown, selection: JSONSelection): JSONPath {
  if (!isMultiSelection(selection)) {
    return selection.path
  }

  const anchorIndex = getChildIndex(json, selection, selection.anchorPath)
  const focusIndex = getChildIndex(json, selection, selection.focusPath)

  return focusIndex < anchorIndex ? selection.focusPath : selection.anchorPath
}

export function getEndPath(json: unknown, selection: JSONSelection): JSONPath {
  if (!isMultiSelection(selection)) {
    return selection.path
  }

  const anchorIndex = getChildIndex(json, selection, selection.anchorPath)
  const focusIndex = getChildIndex(json, selection, selection.focusPath)

  return focusIndex > anchorIndex ? selection.focusPath : selection.anchorPath
}

// TODO: write unit test
export function isSelectionInsidePath(selection: JSONSelection, path: JSONPath): boolean {
  return (
    pathStartsWith(getFocusPath(selection), path) &&
    (getFocusPath(selection).length > path.length || isInsideSelection(selection))
  )
}

export function getSelectionUp(
  json: unknown,
  documentState: DocumentState | undefined,
  selection: JSONSelection | undefined,
  keepAnchorPath = false
): JSONSelection | undefined {
  if (!selection) {
    return undefined
  }

  const focusPath = keepAnchorPath ? getFocusPath(selection) : getStartPath(json, selection)
  const previousPath = getPreviousVisiblePath(json, documentState, focusPath)

  if (keepAnchorPath) {
    // create a multi-selection with multiple nodes
    if (isInsideSelection(selection) || isAfterSelection(selection)) {
      return previousPath !== undefined ? createMultiSelection(focusPath, focusPath) : undefined
    }

    return previousPath !== undefined
      ? createMultiSelection(getAnchorPath(selection), previousPath)
      : undefined
  }

  if (isAfterSelection(selection)) {
    // select the node itself, not the previous node,
    // FIXME: when after an expanded object/array, should go to the last item inside the object/array
    return createValueSelection(focusPath)
  }

  if (isInsideSelection(selection)) {
    // select the node itself, not the previous node,
    return createValueSelection(focusPath)
  }

  if (isKeySelection(selection)) {
    if (previousPath === undefined || previousPath.length === 0) {
      return undefined
    }

    const parentPath = initial(previousPath)
    const parent = getIn(json, parentPath)
    if (Array.isArray(parent) || isEmpty(previousPath)) {
      // switch to value selection: array has no keys, and root object also not
      return createValueSelection(previousPath)
    } else {
      return createKeySelection(previousPath)
    }
  }

  if (isValueSelection(selection)) {
    return previousPath !== undefined ? createValueSelection(previousPath) : undefined
  }

  if (previousPath !== undefined) {
    return createValueSelection(previousPath)
  }

  return undefined
}

export function getSelectionDown(
  json: unknown,
  documentState: DocumentState | undefined,
  selection: JSONSelection | undefined,
  keepAnchorPath = false
): JSONSelection | undefined {
  if (!selection) {
    return undefined
  }
  const focusPath = keepAnchorPath ? getFocusPath(selection) : getEndPath(json, selection)

  // if the focusPath is an Array or object, we must not step into it but
  // over it, we pass state with this array/object collapsed
  const collapsedState = isObjectOrArray(getIn(json, focusPath))
    ? collapsePath(json, documentState, focusPath, true)
    : documentState

  const nextPath = getNextVisiblePath(json, documentState, focusPath)
  const nextPathAfter = getNextVisiblePath(json, collapsedState, focusPath)

  if (keepAnchorPath) {
    // create a multi-selection with multiple nodes
    if (isInsideSelection(selection)) {
      return nextPath !== undefined ? createMultiSelection(nextPath, nextPath) : undefined
    }

    if (isAfterSelection(selection)) {
      return nextPathAfter !== undefined
        ? createMultiSelection(nextPathAfter, nextPathAfter)
        : undefined
    }

    return nextPathAfter !== undefined
      ? createMultiSelection(getAnchorPath(selection), nextPathAfter)
      : undefined
  }

  if (isAfterSelection(selection)) {
    return nextPathAfter !== undefined ? createValueSelection(nextPathAfter) : undefined
  }

  if (isInsideSelection(selection)) {
    return nextPath !== undefined ? createValueSelection(nextPath) : undefined
  }

  if (isValueSelection(selection)) {
    return nextPath !== undefined ? createValueSelection(nextPath) : undefined
  }

  if (isKeySelection(selection)) {
    if (nextPath === undefined || nextPath.length === 0) {
      return undefined
    }

    const parentPath = initial(nextPath) // not nextPathAfter!
    const parent = getIn(json, parentPath)
    if (Array.isArray(parent)) {
      // switch to value selection: array has no keys
      return createValueSelection(nextPath)
    } else {
      return createKeySelection(nextPath)
    }
  }

  if (isMultiSelection(selection)) {
    return nextPathAfter !== undefined
      ? createValueSelection(nextPathAfter)
      : nextPath !== undefined
        ? createValueSelection(nextPath)
        : undefined
  }

  return undefined
}

/**
 * Get the next selection for a value inside the current object/array
 * If there is no next value, select AFTER.
 * Only applicable for ValueSelection
 */
export function getSelectionNextInside(
  json: unknown,
  documentState: DocumentState | undefined,
  path: JSONPath
): JSONSelection | undefined {
  // TODO: write unit tests for getSelectionNextInside
  const parentPath = initial(path)
  const childPath = [last(path) as string]

  const parent: unknown | undefined = getIn(json, parentPath)
  const nextPathInside = parent ? getNextVisiblePath(parent, documentState, childPath) : undefined

  if (nextPathInside) {
    return createValueSelection(parentPath.concat(nextPathInside))
  } else {
    return createAfterSelection(path)
  }
}

/**
 * Find the caret position and its siblings for a given selection
 */
// TODO: unit test
export function findCaretAndSiblings(
  json: unknown,
  documentState: DocumentState | undefined,
  selection: JSONSelection | undefined,
  includeInside: boolean
): {
  next: CaretPosition | undefined
  caret: CaretPosition | undefined
  previous: CaretPosition | undefined
} {
  if (!selection) {
    return { caret: undefined, previous: undefined, next: undefined }
  }
  const visibleCaretPositions = getVisibleCaretPositions(json, documentState, includeInside)

  const index = visibleCaretPositions.findIndex((caret) => {
    return (
      isEqual(caret.path, getFocusPath(selection)) && String(caret.type) === String(selection.type)
    )
  })

  return {
    caret: index !== -1 ? visibleCaretPositions[index] : undefined,

    previous: index !== -1 && index > 0 ? visibleCaretPositions[index - 1] : undefined,

    next:
      index !== -1 && index < visibleCaretPositions.length - 1
        ? visibleCaretPositions[index + 1]
        : undefined
  }
}

export function getSelectionLeft(
  json: unknown,
  documentState: DocumentState | undefined,
  selection: JSONSelection | undefined,
  keepAnchorPath = false,
  includeInside = true
): JSONSelection | undefined {
  if (!selection) {
    return undefined
  }

  const { caret, previous } = findCaretAndSiblings(json, documentState, selection, includeInside)

  if (keepAnchorPath) {
    if (!isMultiSelection(selection)) {
      return createMultiSelection(selection.path, selection.path)
    }

    return undefined
  }

  if (caret && previous) {
    return fromCaretPosition(previous)
  }

  const parentPath = initial(getFocusPath(selection))
  const parent = getIn(json, parentPath)

  if (isValueSelection(selection) && Array.isArray(parent)) {
    return createMultiSelection(selection.path, selection.path)
  }

  if (isMultiSelection(selection) && !Array.isArray(parent)) {
    return createKeySelection(selection.focusPath)
  }

  return undefined
}

export function getSelectionRight(
  json: unknown,
  documentState: DocumentState | undefined,
  selection: JSONSelection | undefined,
  keepAnchorPath = false,
  includeInside = true
): JSONSelection | undefined {
  if (!selection) {
    return undefined
  }

  const { caret, next } = findCaretAndSiblings(json, documentState, selection, includeInside)

  if (keepAnchorPath) {
    if (!isMultiSelection(selection)) {
      return createMultiSelection(selection.path, selection.path)
    }

    return undefined
  }

  if (caret && next) {
    return fromCaretPosition(next)
  }

  if (isMultiSelection(selection)) {
    return createValueSelection(selection.focusPath)
  }

  return undefined
}

/**
 * Get a proper initial selection based on what is visible
 */
export function getInitialSelection(
  json: unknown,
  documentState: DocumentState | undefined
): JSONSelection {
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
  return path === undefined || path.length === 0 || Array.isArray(getIn(json, initial(path)))
    ? createValueSelection(path) // Array items and root object/array do not have a key, so select value in that case
    : createKeySelection(path)
}

export function createSelectionFromOperations(
  json: unknown,
  operations: JSONPatchDocument
): JSONSelection | undefined {
  if (operations.length === 1) {
    const operation = first(operations) as JSONPatchOperation
    if (operation.op === 'replace') {
      // a replaced value
      const path = parsePath(json, operation.path)

      return createValueSelection(path)
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

      return createKeySelection(path)
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

export function findRootPath(json: unknown, selection: JSONSelection): JSONPath {
  return singleItemSelected(selection) && isObjectOrArray(getIn(json, getFocusPath(selection)))
    ? getFocusPath(selection)
    : initial(getFocusPath(selection)) // the parent path of the paths
}

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
export function removeEditModeFromSelection(
  selection: JSONSelection | undefined
): JSONSelection | undefined {
  if (isEditingSelection(selection)) {
    const { type, path } = selection
    return { type, path } as KeySelection | ValueSelection
  }

  return selection
}

export function createKeySelection(path: JSONPath): KeySelection {
  return { type: SelectionType.key, path }
}

export function createEditKeySelection(path: JSONPath, initialValue?: string): EditKeySelection {
  return { type: SelectionType.key, path, edit: true, initialValue }
}

export function createValueSelection(path: JSONPath): ValueSelection {
  return { type: SelectionType.value, path }
}

export function createEditValueSelection(
  path: JSONPath,
  initialValue?: string
): EditValueSelection {
  return { type: SelectionType.value, path, edit: true, initialValue }
}

export function createInsideSelection(path: JSONPath): InsideSelection {
  return {
    type: SelectionType.inside,
    path
  }
}

export function createAfterSelection(path: JSONPath): AfterSelection {
  return {
    type: SelectionType.after,
    path
  }
}

export function createMultiSelection(anchorPath: JSONPath, focusPath: JSONPath): MultiSelection {
  // normalize the paths to both be a child of a shared parent
  const sharedPath = findSharedPath(anchorPath, focusPath)
  const isParent = anchorPath.length > sharedPath.length && focusPath.length > sharedPath.length

  return {
    type: SelectionType.multi,
    anchorPath: isParent ? sharedPath.concat(anchorPath[sharedPath.length]) : sharedPath,
    focusPath: isParent ? sharedPath.concat(focusPath[sharedPath.length]) : sharedPath
  }
}

/**
 * Turn selected contents into plain text partial JSON, usable for copying to
 * clipboard for example.
 */
export function selectionToPartialJson(
  json: unknown,
  selection: JSONSelection | undefined,
  indentation: number | string | undefined,
  parser: JSONParser
): string | undefined {
  if (isKeySelection(selection)) {
    return String(last(selection.path))
  }

  if (isValueSelection(selection)) {
    const value = getIn(json, selection.path)
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

  return undefined
}

export function isEditingSelection(
  selection: JSONSelection | undefined
): selection is EditKeySelection | EditValueSelection {
  return (
    (isKeySelection(selection) || isValueSelection(selection)) &&
    (selection as Record<string, unknown>).edit === true
  )
}

/**
 * Create a selection which selects the root of the document
 */
// TODO: write unit tests
export function selectAll(): JSONSelection {
  return createValueSelection([])
}

// TODO: write unit tests
export function hasSelectionContents(selection: JSONSelection | undefined): boolean {
  return isKeySelection(selection) || isValueSelection(selection) || isMultiSelection(selection)
}

/**
 * Test whether the current selection can be converted.
 * That is the case when the selection is a key/value, or a multi selection with only one path
 */
export function canConvert(selection: JSONSelection | undefined): boolean {
  return (
    isKeySelection(selection) ||
    isValueSelection(selection) ||
    isMultiSelectionWithOneItem(selection)
  )
}

// TODO: unit test
// eslint-disable-next-line consistent-return
export function fromCaretPosition(caretPosition: CaretPosition): JSONSelection {
  switch (caretPosition.type) {
    case CaretType.key:
      return createKeySelection(caretPosition.path)
    case CaretType.value:
      return createValueSelection(caretPosition.path)
    case CaretType.after:
      return createAfterSelection(caretPosition.path)
    case CaretType.inside:
      return createInsideSelection(caretPosition.path)
  }
}

// TODO: unit test
// eslint-disable-next-line consistent-return
export function fromSelectionType(selectionType: SelectionType, path: JSONPath): JSONSelection {
  switch (selectionType) {
    case SelectionType.key:
      return createKeySelection(path)
    case SelectionType.value:
      return createValueSelection(path)
    case SelectionType.after:
      return createAfterSelection(path)
    case SelectionType.inside:
      return createInsideSelection(path)
    case SelectionType.multi:
    case SelectionType.text: // type `text` is not applicable, but we need to handle all types
      return createMultiSelection(path, path)
  }
}

export function selectionIfOverlapping(
  json: unknown | undefined,
  selection: JSONSelection | undefined,
  path: JSONPath
): JSONSelection | undefined {
  if (!selection) {
    return undefined
  }

  if (pathInSelection(json, selection, path)) {
    return selection
  }

  const sharedPath = isMultiSelection(selection) ? initial(selection.focusPath) : selection.path
  if (pathStartsWith(sharedPath, path)) {
    return selection
  }

  return undefined
}

export function pathInSelection(
  json: unknown | undefined,
  selection: JSONSelection | undefined,
  path: JSONPath
): boolean {
  if (json === undefined || !selection) {
    return false
  }

  if (isKeySelection(selection) || isInsideSelection(selection) || isAfterSelection(selection)) {
    return isEqual(selection.path, path)
  }

  if (isValueSelection(selection)) {
    return pathStartsWith(path, selection.path)
  }

  if (isMultiSelection(selection)) {
    const startPath = getStartPath(json, selection)
    const endPath = getEndPath(json, selection)
    const parentPath = initial(selection.focusPath)

    if (!pathStartsWith(path, parentPath) || path.length <= parentPath.length) {
      return false
    }

    const startIndex = getChildIndex(json, selection, startPath)
    const endIndex = getChildIndex(json, selection, endPath)
    const pathIndex = getChildIndex(json, selection, path)
    return pathIndex !== -1 && pathIndex >= startIndex && pathIndex <= endIndex
  }

  return false
}

function getChildIndex(json: unknown, selection: MultiSelection, path: JSONPath): number {
  const parentPath = initial(selection.focusPath)
  if (!pathStartsWith(path, parentPath) || path.length <= parentPath.length) {
    return -1
  }

  const key = path[parentPath.length]
  const parent = getIn(json, parentPath)

  if (isJSONObject(parent)) {
    const keys = Object.keys(parent)
    return keys.indexOf(key)
  }

  if (isJSONArray(parent)) {
    const index = int(key)
    if (index < parent.length) {
      return index
    }
  }

  return -1
}

// TODO: write some unit tests
export function getFocusPath(selection: JSONSelection): JSONPath {
  return isMultiSelection(selection) ? selection.focusPath : selection.path
}

// TODO: write some unit tests
export function getAnchorPath(selection: JSONSelection): JSONPath {
  return isMultiSelection(selection) ? selection.anchorPath : selection.path
}
