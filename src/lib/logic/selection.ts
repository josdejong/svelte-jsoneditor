import type { JSONData, JSONPatchDocument, JSONPath, JSONPointer } from 'immutable-json-patch'
import {
  compileJSONPointer,
  getIn,
  parseJSONPointerWithArrayIndices,
  startsWithJSONPointer
} from 'immutable-json-patch'
import { first, initial, isEmpty, isEqual, last } from 'lodash-es'
import { isObjectOrArray } from '../utils/typeUtils.js'
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
  JSONPointerMap,
  KeySelection,
  MultiSelection,
  Selection,
  ValueSelection
} from '../types.js'
import { CaretType, SelectionType } from '../types.js'
import { isJSONArray, isJSONObject } from '../utils/jsonUtils.js'
import { isJSONPatchCopy, isJSONPatchMove } from '../typeguards.js'

export function isAfterSelection(selection: Selection | undefined): selection is AfterSelection {
  return selection && selection.type === SelectionType.after
}

export function isInsideSelection(selection: Selection | undefined): selection is InsideSelection {
  return selection && selection.type === SelectionType.inside
}

export function isKeySelection(selection: Selection | undefined): selection is KeySelection {
  return selection && selection.type === SelectionType.key
}

export function isValueSelection(selection: Selection | undefined): selection is ValueSelection {
  return selection && selection.type === SelectionType.value
}

export function isMultiSelection(selection: Selection | undefined): selection is MultiSelection {
  return selection && selection.type === SelectionType.multi
}

/**
 * Expand a selection start and end into an array containing all paths
 * between (and including) start and end
 */
export function expandSelection(
  json: JSONData,
  anchorPath: JSONPath,
  focusPath: JSONPath
): JSONPath[] {
  if (isEqual(anchorPath, focusPath)) {
    // just a single node
    return [anchorPath]
  } else {
    // multiple nodes
    const sharedPath = findSharedPath(anchorPath, focusPath)

    if (anchorPath.length === sharedPath.length || focusPath.length === sharedPath.length) {
      // a parent and a child, like ['arr', 1] and ['arr']
      return [sharedPath]
    }

    const anchorKey = anchorPath[sharedPath.length]
    const focusKey = focusPath[sharedPath.length]
    const value = getIn(json, sharedPath)

    if (isJSONObject(value)) {
      const keys = Object.keys(value)
      const anchorIndex = keys.indexOf(anchorKey as string)
      const focusIndex = keys.indexOf(focusKey as string)

      if (anchorIndex !== -1 && focusIndex !== -1) {
        const startIndex = Math.min(anchorIndex, focusIndex)
        const endIndex = Math.max(anchorIndex, focusIndex)
        const paths = []

        for (let i = startIndex; i <= endIndex; i++) {
          paths.push(sharedPath.concat(keys[i]))
        }

        return paths
      }
    }

    if (isJSONArray(value)) {
      const startIndex = Math.min(anchorKey as number, focusKey as number)
      const endIndex = Math.max(anchorKey as number, focusKey as number)
      const paths = []

      for (let i = startIndex; i <= endIndex; i++) {
        paths.push(sharedPath.concat(i))
      }

      return paths
    }
  }

  throw new Error('Failed to create selection')
}

export function getParentPath(selection: Selection): JSONPath {
  if (isInsideSelection(selection)) {
    return selection.focusPath
  } else {
    return initial(selection.focusPath)
  }
}

export function getStartPath(selection: Selection): JSONPath {
  return isMultiSelection(selection) ? first(selection.paths) : selection.focusPath
}

export function getEndPath(selection: Selection): JSONPath {
  return isMultiSelection(selection) ? last(selection.paths) : selection.focusPath
}

/**
 * @param {Selection} selection
 * @param {JSONPath} path
 * @return boolean
 */
// TODO: write unit test
export function isSelectionInsidePath(selection, path) {
  return (
    pathStartsWith(selection.focusPath, path) &&
    (selection.focusPath.length > path.length || isInsideSelection(selection))
  )
}

/**
 * @param {Selection} selection
 * @param {JSONPath} path
 * @param {string} anchorType
 * @return boolean
 */
// TODO: write unit test
export function isPathInsideSelection(selection, path, anchorType) {
  if (!selection) {
    return false
  }

  const p = path.slice(0)

  if (isMultiSelection(selection)) {
    while (p.length > 0) {
      if (selection.pointersMap[compileJSONPointer(p)] === true) {
        return true
      }

      p.pop()
    }
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
  json: JSONData,
  documentState: DocumentState,
  keepAnchorPath = false,
  useFocusPath = false
): Selection | null {
  const selection = documentState.selection
  const path =
    !useFocusPath && isMultiSelection(selection) ? first(selection.paths) : selection.focusPath
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
    const parentPath: JSONPath = initial(previousPath)
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
  json: JSONData,
  documentState: DocumentState,
  keepAnchorPath = false,
  useFocusPath = false
): Selection | null {
  const selection = documentState.selection
  // TODO: this function is too large, break it down in two separate functions: one for keepAnchorPath = true, and one for keepAnchorPath = false?
  const path =
    !useFocusPath && isMultiSelection(selection) ? last(selection.paths) : selection.focusPath
  const nextPath = getNextVisiblePath(json, documentState, path)
  const anchorPath = nextPath
  const focusPath = nextPath

  if (nextPath === null) {
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
    const parentPath: JSONPath = initial(nextPath)
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
  json: JSONData,
  documentState: DocumentState,
  path: JSONPath
): Selection | null {
  // TODO: write unit tests for getSelectionNextInside
  const parentPath = initial(path)
  const childPath = [last(path)]

  const nextPathInside = getNextVisiblePath(getIn(json, parentPath), documentState, childPath)

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
  json: JSONData,
  documentState: DocumentState,
  includeInside: boolean
): { next: CaretPosition | null; caret: CaretPosition | null; previous: CaretPosition | null } {
  const selection = documentState.selection
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
  json: JSONData,
  documentState: DocumentState,
  keepAnchorPath = false,
  includeInside = true
): Selection | null {
  const selection = documentState.selection
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

  const parentPath: JSONPath = initial(selection.focusPath)
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
  json: JSONData,
  documentState: DocumentState,
  keepAnchorPath = false,
  includeInside = true
): Selection | null {
  const selection = documentState.selection
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
export function getInitialSelection(json: JSONData, documentState: DocumentState): Selection {
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
  json: JSONData,
  operations: JSONPatchDocument
): Selection | null {
  if (operations.length === 1) {
    const operation = first(operations)
    if (operation.op === 'replace' || operation.op === 'move') {
      // replaced value
      const path = parseJSONPointerWithArrayIndices(json, operation.path)

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
      const path = parseJSONPointerWithArrayIndices(json, firstOp.path)

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
    .map((operation) => parseJSONPointerWithArrayIndices(json, operation.path))

  if (isEmpty(paths)) {
    return null
  }

  // TODO: make this function robust against operations which do not have consecutive paths or have wrongly ordered paths

  return {
    type: SelectionType.multi,
    paths,
    anchorPath: first(paths),
    focusPath: last(paths),
    pointersMap: createPointersMap(paths)
  }
}

// TODO: write unit tests
export function createPointersMap(paths: JSONPath[]): { [pointer: JSONPointer]: boolean } {
  const pointersMap = {}

  paths.forEach((path) => {
    pointersMap[compileJSONPointer(path)] = true
  })

  return pointersMap
}

// TODO: write unit tests
export function createSinglePointersMap(path: JSONPath): { [pointer: JSONPointer]: boolean } {
  return {
    [compileJSONPointer(path)]: true
  }
}

/**
 * Find the common path of two paths.
 * For example findCommonRoot(['arr', '1', 'name'], ['arr', '1', 'address', 'contact']) returns ['arr', '1']
 * @param {JSONPath} path1
 * @param {JSONPath} path2
 * @return {JSONPath}
 */
// TODO: write unit tests for findSharedPath
export function findSharedPath(path1, path2) {
  let i = 0
  while (i < path1.length && i < path2.length && path1[i] === path2[i]) {
    i++
  }

  return path1.slice(0, i)
}

/**
 * @param {Selection} [selection]
 * @returns {boolean}
 */
export function singleItemSelected(selection) {
  return (
    selection &&
    (isKeySelection(selection) ||
      isValueSelection(selection) ||
      (isMultiSelection(selection) && selection.paths.length === 1))
  )
}

/**
 * @param {JSON} json
 * @param {Selection} selection
 * @return {JSONPath}
 */
export function findRootPath(json, selection) {
  return singleItemSelected(selection) && isObjectOrArray(getIn(json, selection.focusPath))
    ? selection.focusPath
    : initial(selection.focusPath) // the parent path of the paths
}

/**
 * @param {JSONPath} path
 * @param {JSONPath} parentPath
 * @return boolean
 */
// TODO: unit test
export function pathStartsWith(path, parentPath) {
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
      selection: createKeySelection(selection.focusPath, false)
    }
  }

  return documentState
}

export function createKeySelection(path: JSONPath, edit: boolean): KeySelection {
  return {
    type: SelectionType.key,
    anchorPath: path,
    focusPath: path,
    pointersMap: createSinglePointersMap(path),
    edit
  }
}

export function createValueSelection(path: JSONPath, edit: boolean): ValueSelection {
  return {
    type: SelectionType.value,
    anchorPath: path,
    focusPath: path,
    pointersMap: createSinglePointersMap(path),
    edit
  }
}

export function createInsideSelection(path: JSONPath): InsideSelection {
  return {
    type: SelectionType.inside,
    anchorPath: path,
    focusPath: path,
    pointersMap: createSinglePointersMap(path)
  }
}

export function createAfterSelection(path: JSONPath): AfterSelection {
  return {
    type: SelectionType.after,
    anchorPath: path,
    focusPath: path,
    pointersMap: createSinglePointersMap(path)
  }
}

export function createMultiSelection(
  json: JSONData,
  anchorPath: JSONPath,
  focusPath: JSONPath
): MultiSelection {
  const paths = expandSelection(json, anchorPath, focusPath)

  // the original anchorPath or focusPath may be somewhere inside the
  // returned paths: when one of the two paths is inside an object and the
  // other is outside. Then the selection is enlarged to span the whole object.
  const focusPathLast =
    pathStartsWith(focusPath, last(paths)) || pathStartsWith(anchorPath, first(paths))

  return {
    type: SelectionType.multi,
    anchorPath: focusPathLast ? first(paths) : last(paths),
    focusPath: focusPathLast ? last(paths) : first(paths),
    paths,
    pointersMap: createPointersMap(paths)
  }
}

/**
 * Turn selected contents into plain text partial JSON, usable for copying to
 * clipboard for example.
 */
export function selectionToPartialJson(
  json: JSONData,
  selection: Selection,
  indentation: number | string | null = 2
): string | null {
  if (isKeySelection(selection)) {
    return String(last(selection.focusPath))
  }

  if (isValueSelection(selection)) {
    const value = getIn(json, selection.focusPath)
    return typeof value === 'string' ? value : JSON.stringify(value, null, indentation) // TODO: customizable indentation?
  }

  if (isMultiSelection(selection)) {
    if (isEmpty(selection.focusPath)) {
      // root object -> does not have a parent key/index
      return JSON.stringify(json, null, indentation)
    }

    const parentPath = getParentPath(selection)
    const parent = getIn(json, parentPath)
    if (Array.isArray(parent)) {
      if (selection.paths.length === 1) {
        // do not suffix a single selected array item with a comma
        const item = getIn(json, first(selection.paths))
        return JSON.stringify(item, null, indentation)
      } else {
        return selection.paths
          .map((path) => {
            const item = getIn(json, path)
            return `${JSON.stringify(item, null, indentation)},`
          })
          .join('\n')
      }
    } else {
      // parent is Object
      return selection.paths
        .map((path) => {
          const key = last(path)
          const value = getIn(json, path)
          return `${JSON.stringify(key)}: ${JSON.stringify(value, null, indentation)},`
        })
        .join('\n')
    }
  }

  return null
}

export function getSelectionPaths(selection: Selection | undefined): JSONPath[] {
  return isMultiSelection(selection) ? selection.paths : [selection.focusPath]
}

export function isEditingSelection(selection: Selection): boolean {
  return (isKeySelection(selection) || isValueSelection(selection)) && selection.edit
}

// TODO: write unit tests
export function createSelectionMap(selection: Selection): JSONPointerMap<Selection> {
  if (!selection) {
    return {}
  }

  const map = {}

  const paths = getSelectionPaths(selection)

  paths.forEach((path) => {
    map[compileJSONPointer(path)] = selection
  })

  return map
}

export function updateSelectionInDocumentState(
  documentState: DocumentState,
  selection: Selection | undefined,
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
// TODO: write tests
export function selectAll(): Selection {
  return createValueSelection([], false)
}

/**
 * Test whether the current selection can be converted.
 * That is the case when the selection is a key/value, or a multi selection with only one path
 * @param {Selection} selection
 * @return {boolean}
 */
export function canConvert(selection) {
  if (!selection) {
    return false
  }

  if (isKeySelection(selection) || isValueSelection(selection)) {
    return true
  }

  if (isMultiSelection(selection) && selection.paths.length === 1) {
    return true
  }
}

// TODO: unit test
export function fromCaretPosition(caretPosition: CaretPosition): Selection {
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
  json: JSONData,
  selectionType: SelectionType,
  path: JSONPath
): Selection {
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

// TODO: unit test
export function selectionIfOverlapping(
  selection: Selection | undefined,
  pointer: JSONPointer
): Selection | undefined {
  if (!selection) {
    return undefined
  }

  return Object.keys(selection.pointersMap).some((p) => startsWithJSONPointer(p, pointer))
    ? selection
    : undefined
}
