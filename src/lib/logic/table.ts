import type { JSONArray, JSONPatchOperation, JSONPath, JSONValue } from 'immutable-json-patch'
import {
  compileJSONPointer,
  isJSONArray,
  isJSONObject,
  parseJSONPointer
} from 'immutable-json-patch'
import { groupBy, isEmpty, isEqual, mapValues, partition } from 'lodash-es'
import type {
  DocumentState,
  JSONSelection,
  SortedColumn,
  TableCellIndex,
  ValidationError
} from '$lib/types.js'
import { createValueSelection, pathStartsWith } from './selection.js'
import { isNumber } from '../utils/numberUtils.js'
import type { Dictionary } from 'lodash'
import { stringifyJSONPath, stripRootObject } from '../utils/pathUtils.js'
import { ValidationSeverity } from '$lib/types.js'

export function getColumns(
  array: JSONArray,
  flatten: boolean,
  maxLookupCount = Math.min(isJSONArray(array) ? array.length : 0, 100)
): JSONPath[] {
  const compiledPaths: Set<string> = new Set()

  // We read samples spread through the whole array, from begin to end.
  // When the array is sorted, and a specific field is present only at the last
  // couple of items of the array or in the middle, we want to pick that up too.
  const iEnd = isJSONArray(array) ? array.length - 1 : 0
  for (let i = 0; i < maxLookupCount; i++) {
    const index = i === 0 ? 0 : Math.floor(iEnd / i)
    const paths: JSONPath[] = flatten
      ? getRecursiveKeys(array[index])
      : getShallowKeys(array[index])

    paths.forEach((path) => compiledPaths.add(compileJSONPointer(path)))
  }

  return Array.from(compiledPaths).map(parseJSONPointer)
}

export function getShallowKeys(value: JSONValue): JSONPath[] {
  return isJSONObject(value) ? Object.keys(value).map((key) => [key]) : [[]]
}

export function getRecursiveKeys(value: JSONValue): JSONPath[] {
  const paths: JSONPath[] = []

  function recurse(value: JSONValue, path: JSONPath) {
    if (isJSONObject(value)) {
      Object.keys(value).forEach((key) => {
        recurse(value[key], path.concat(key))
      })
    } else {
      // array or primitive value like string or number
      paths.push(path)
    }
  }

  recurse(value, [])

  return paths
}

export interface VisibleSection {
  startIndex: number
  endIndex: number
  startHeight: number
  visibleHeight: number
  endHeight: number
  averageItemHeight: number
  visibleItems: JSONArray
}

// TODO: write unit tests
export function calculateVisibleSection(
  scrollTop: number,
  viewPortHeight: number,
  json: JSONValue | undefined,
  itemHeights: Record<number, number>,
  defaultItemHeight: number,
  margin = 80
): VisibleSection {
  const itemCount = isJSONArray(json) ? json.length : 0
  const averageItemHeight = calculateAverageItemHeight(itemHeights, defaultItemHeight)
  const viewPortTop = scrollTop - margin
  const viewPortBottom = viewPortHeight + 2 * margin

  const getItemHeight = (index: number) => itemHeights[index] || defaultItemHeight

  let startIndex = 0
  let startHeight = 0
  while (startHeight < viewPortTop && startIndex < itemCount) {
    startHeight += getItemHeight(startIndex)
    startIndex++
  }
  if (startIndex > 0) {
    // go one item back, else there is white space at the top for up to 1 missing item
    startIndex--
    startHeight -= getItemHeight(startIndex)
  }

  let endIndex = startIndex
  let visibleHeight = 0
  while (visibleHeight < viewPortBottom && endIndex < itemCount) {
    visibleHeight += getItemHeight(endIndex)
    endIndex++
  }

  let endHeight = 0
  for (let i = endIndex; i < itemCount; i++) {
    endHeight += getItemHeight(i)
  }

  const visibleItems = isJSONArray(json) ? json.slice(startIndex, endIndex) : []

  return {
    startIndex,
    endIndex,
    startHeight,
    endHeight,
    averageItemHeight,
    visibleHeight,
    visibleItems
  }
}

// TODO: cleanup if we will not use it in the end
// TODO: write unit tests
export function calculateVisibleSectionApprox(
  scrollTop: number,
  viewPortHeight: number,
  json: JSONValue | undefined,
  defaultItemHeight: number
): VisibleSection {
  const itemCount = isJSONArray(json) ? json.length : 0
  const averageItemHeight = defaultItemHeight

  const viewPortTop = scrollTop
  const startIndex = Math.floor(viewPortTop / defaultItemHeight)
  const startHeight = startIndex * defaultItemHeight
  const endIndex = Math.ceil((viewPortTop + viewPortHeight) / defaultItemHeight)
  const visibleHeight = (endIndex - startIndex) * defaultItemHeight
  const endHeight = (itemCount - endIndex) * defaultItemHeight

  const visibleItems = isJSONArray(json) ? json.slice(startIndex, endIndex) : []

  return {
    startIndex,
    endIndex,
    startHeight,
    endHeight,
    averageItemHeight,
    visibleHeight,
    visibleItems
  }
}

// TODO: write unit tests
export function calculateAbsolutePosition(
  path: JSONPath,
  columns: JSONPath[],
  itemHeights: Record<number, number>,
  defaultItemHeight: number
): number {
  const { rowIndex } = toTableCellPosition(path, columns)

  let top = 0
  for (let currentIndex = 0; currentIndex < rowIndex; currentIndex++) {
    top += itemHeights[currentIndex] || defaultItemHeight
  }

  // TODO: also calculate left
  return top
}

function calculateAverageItemHeight(
  itemHeights: Record<number, number>,
  defaultItemHeight: number
): number {
  const values = Object.values(itemHeights) // warning: itemHeights is mutated and not updated itself, we can't watch it!
  if (isEmpty(values)) {
    return defaultItemHeight
  }

  const add = (a: number, b: number) => a + b
  const total = values.reduce(add)
  return total / values.length
}

export function selectPreviousRow(columns: JSONPath[], selection: JSONSelection): JSONSelection {
  const { rowIndex, columnIndex } = toTableCellPosition(selection.focusPath, columns)

  if (rowIndex > 0) {
    const previousPosition = { rowIndex: rowIndex - 1, columnIndex }
    const previousPath = fromTableCellPosition(previousPosition, columns)
    return createValueSelection(previousPath, false)
  }

  return selection
}

export function selectNextRow(
  json: JSONValue,
  columns: JSONPath[],
  selection: JSONSelection
): JSONSelection {
  const { rowIndex, columnIndex } = toTableCellPosition(selection.focusPath, columns)

  if (rowIndex < (json as JSONArray).length - 1) {
    const nextPosition = { rowIndex: rowIndex + 1, columnIndex }
    const nextPath = fromTableCellPosition(nextPosition, columns)
    return createValueSelection(nextPath, false)
  }

  return selection
}

export function selectPreviousColumn(columns: JSONPath[], selection: JSONSelection): JSONSelection {
  const { rowIndex, columnIndex } = toTableCellPosition(selection.focusPath, columns)

  if (columnIndex > 0) {
    const previousPosition = { rowIndex, columnIndex: columnIndex - 1 }
    const previousPath = fromTableCellPosition(previousPosition, columns)
    return createValueSelection(previousPath, false)
  }

  return selection
}

export function selectNextColumn(columns: JSONPath[], selection: JSONSelection): JSONSelection {
  const { rowIndex, columnIndex } = toTableCellPosition(selection.focusPath, columns)

  if (columnIndex < columns.length - 1) {
    const nextPosition = { rowIndex, columnIndex: columnIndex + 1 }
    const nextPath = fromTableCellPosition(nextPosition, columns)
    return createValueSelection(nextPath, false)
  }

  return selection
}

export function toTableCellPosition(path: JSONPath, columns: JSONPath[]): TableCellIndex {
  const [index, ...column] = path

  const rowIndex = parseInt(index, 10)

  return {
    rowIndex: !isNaN(rowIndex) ? rowIndex : -1,
    columnIndex: columns.findIndex((c) => pathStartsWith(column, c))
  }
}

export function fromTableCellPosition(position: TableCellIndex, columns: JSONPath[]): JSONPath {
  const { rowIndex, columnIndex } = position

  return [String(rowIndex), ...columns[columnIndex]]
}

export function stringifyTableCellPosition(position: TableCellIndex): string {
  const { rowIndex, columnIndex } = position

  return `${rowIndex}:${columnIndex}`
}

interface GroupedValidationErrorsByRow {
  row: ValidationError[]
  columns: Dictionary<ValidationError[]>
}

export interface GroupedValidationErrors {
  root: ValidationError[]
  rows: Dictionary<GroupedValidationErrorsByRow>
}

/**
 * Group validation errors for use in the Table view: per column, and a group for the row as a whole
 */
export function groupValidationErrors(
  validationErrors: ValidationError[],
  columns: JSONPath[]
): GroupedValidationErrors {
  const [arrayErrors, rootErrors] = partition(validationErrors, (validationError) =>
    isNumber(validationError.path[0])
  )

  const errorsByRow: Dictionary<ValidationError[]> = groupBy(arrayErrors, findRowIndex)

  const groupedErrorsByRow = mapValues(errorsByRow, (errors) => {
    const groupByRow: GroupedValidationErrorsByRow = {
      row: [],
      columns: {}
    }

    errors.forEach((error) => {
      const columnIndex = findColumnIndex(error, columns)

      if (columnIndex !== -1) {
        if (groupByRow.columns[columnIndex] === undefined) {
          groupByRow.columns[columnIndex] = []
        }
        groupByRow.columns[columnIndex].push(error)
      } else {
        groupByRow.row.push(error)
      }
    })

    return groupByRow
  })

  return {
    root: rootErrors,
    rows: groupedErrorsByRow
  }
}

export function mergeValidationErrors(
  path: JSONPath,
  validationErrors: ValidationError[] | undefined
): ValidationError | undefined {
  if (!validationErrors || validationErrors.length === 0) {
    return undefined
  }

  if (validationErrors.length === 1) {
    return validationErrors[0]
  }

  return {
    path,
    message:
      'Multiple validation issues: ' +
      validationErrors
        .map((error) => {
          return stripRootObject(stringifyJSONPath(error.path)) + ' ' + error.message
        })
        .join(', '),
    severity: ValidationSeverity.warning
  }
}

function findRowIndex(error: ValidationError): number {
  return parseInt(error.path[0], 10)
}

function findColumnIndex(error: ValidationError, columns: JSONPath[]): number {
  const position = toTableCellPosition(error.path, columns)

  if (position.columnIndex !== -1) {
    return position.columnIndex
  }

  return -1
}

/**
 * Clear the sorted column from the documentState when it is affected by the operations
 */
export function clearSortedColumnWhenAffectedByOperations(
  documentState: DocumentState,
  operations: JSONPatchOperation[],
  columms: JSONPath[]
): DocumentState {
  const mustBeCleared = operations.some((operation) =>
    operationAffectsSortedColumn(documentState.sortedColumn, operation, columms)
  )

  if (mustBeCleared) {
    return {
      ...documentState,
      sortedColumn: undefined
    }
  }

  return documentState
}

export function operationAffectsSortedColumn(
  sortedColumn: SortedColumn | undefined,
  operation: JSONPatchOperation,
  columns: JSONPath[]
): boolean {
  if (!sortedColumn) {
    return false
  }

  // an operation of replacing a value in a different column does not affect the currently sorted order
  if (operation.op === 'replace') {
    const path = parseJSONPointer(operation.path)
    const { rowIndex, columnIndex } = toTableCellPosition(path, columns)
    const selectedColumnIndex = columns.findIndex((column) => isEqual(column, sortedColumn.path))

    if (rowIndex !== -1 && columnIndex !== -1 && columnIndex !== selectedColumnIndex) {
      return false
    }
  }

  // TODO: there are more cases where we can known an operation does not affect the sorted order, improve this
  //  For example adding a nested value in a different column, or removing a full row.

  return true
}

/**
 * Find nested arrays inside a JSON object
 */
export function findNestedArrays(json: JSONValue, maxLevel = 2): JSONPath[] {
  const props: JSONPath[] = []

  function recurse(value: JSONValue, path: JSONPath) {
    if (isJSONObject(value) && path.length < maxLevel) {
      Object.keys(value).forEach((key) => {
        recurse(value[key], path.concat(key))
      })
    }

    if (isJSONArray(value)) {
      props.push(path)
    }
  }

  recurse(json, [])

  return props
}
