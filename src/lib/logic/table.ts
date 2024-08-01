import type { JSONPatchOperation, JSONPath } from 'immutable-json-patch'
import {
  compileJSONPointer,
  isJSONArray,
  isJSONObject,
  parseJSONPointer
} from 'immutable-json-patch'
import { groupBy, isEmpty, isEqual, mapValues, partition } from 'lodash-es'
import type { JSONSelection, SortedColumn, TableCellIndex, ValidationError } from '$lib/types.js'
import { ValidationSeverity } from '$lib/types.js'
import { createValueSelection, getFocusPath, pathStartsWith } from './selection.js'
import { containsNumber } from '../utils/numberUtils.js'
import type { Dictionary } from 'lodash'
import { stringifyJSONPath } from '$lib/utils/pathUtils.js'
import { forEachSample } from '$lib/utils/arrayUtils.js'
import { isObject } from '$lib/utils/typeUtils.js'

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
type NestedObject = Record<string, NestedObject>

const endOfPath = Symbol('path')

export function getColumns(
  array: Array<unknown>,
  flatten: boolean,
  maxSampleCount = Infinity
): JSONPath[] {
  const merged: NestedObject = {}

  if (Array.isArray(array)) {
    // We read samples spread through the whole array, from begin to end.
    // When the array is sorted, and a specific field is present only at the last
    // couple of items of the array or in the middle, we want to pick that up too.
    forEachSample(array, maxSampleCount, (item) => {
      if (isObject(item)) {
        _recurseObject(item, merged, flatten)
      } else {
        merged[endOfPath] = true
      }
    })
  }

  const paths: JSONPath[] = []
  if (endOfPath in merged) {
    paths.push([])
  }
  _collectPaths(merged, [], paths, flatten)

  return paths
}

// internal function for getColumns
// mutates the argument merged
function _recurseObject(object: NestedObject, merged: NestedObject, flatten: boolean): void {
  for (const key in object) {
    const value = object[key]
    const valueMerged = merged[key] || (merged[key] = {})

    if (isObject(value) && flatten) {
      _recurseObject(value, valueMerged, flatten)
    } else {
      if (valueMerged[endOfPath] === undefined) {
        valueMerged[endOfPath] = true
      }
    }
  }
}

// internal function for getColumns
// mutates the argument paths
function _collectPaths(
  object: NestedObject,
  parentPath: JSONPath,
  paths: JSONPath[],
  flatten: boolean
): void {
  for (const key in object) {
    const path = parentPath.concat(key)
    const value = object[key]

    if (value && value[endOfPath] === true) {
      paths.push(path)
    }

    if (isJSONObject(value) && flatten) {
      _collectPaths(value, path, paths, flatten)
    }
  }
}

export function maintainColumnOrder(
  newColumns: JSONPath[],
  previousColumns: JSONPath[]
): JSONPath[] {
  const orderedColumns = new Set(previousColumns.map(compileJSONPointer))
  const newColumnsSet = new Set(newColumns.map(compileJSONPointer))

  // delete the columns that are gone now
  for (const column of orderedColumns) {
    if (!newColumnsSet.has(column)) {
      orderedColumns.delete(column)
    }
  }

  // append the new columns to the end
  for (const column of newColumnsSet) {
    if (!orderedColumns.has(column)) {
      orderedColumns.add(column)
    }
  }

  return [...orderedColumns].map(parseJSONPointer)
}

export function getShallowKeys(value: unknown): JSONPath[] {
  return isJSONObject(value) ? Object.keys(value).map((key) => [key]) : [[]]
}

export function getRecursiveKeys(value: unknown): JSONPath[] {
  const paths: JSONPath[] = []

  function recurse(value: unknown, path: JSONPath) {
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
  visibleItems: Array<unknown>
}

// TODO: write unit tests
export function calculateVisibleSection(
  scrollTop: number,
  viewPortHeight: number,
  json: unknown | undefined,
  itemHeights: Record<number, number>,
  defaultItemHeight: number,
  searchBoxOffset: number,
  margin = 80
): VisibleSection {
  const itemCount = isJSONArray(json) ? json.length : 0
  const averageItemHeight = calculateAverageItemHeight(itemHeights, defaultItemHeight)
  const viewPortTop = scrollTop - margin
  const viewPortBottom = viewPortHeight + 2 * margin

  const getItemHeight = (index: number) => itemHeights[index] || defaultItemHeight

  let startIndex = 0
  let startHeight = searchBoxOffset
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
  json: unknown | undefined,
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
  const { rowIndex, columnIndex } = toTableCellPosition(getFocusPath(selection), columns)

  if (rowIndex > 0) {
    const previousPosition = { rowIndex: rowIndex - 1, columnIndex }
    const previousPath = fromTableCellPosition(previousPosition, columns)
    return createValueSelection(previousPath)
  }

  return selection
}

export function selectNextRow(
  json: unknown,
  columns: JSONPath[],
  selection: JSONSelection
): JSONSelection {
  const { rowIndex, columnIndex } = toTableCellPosition(getFocusPath(selection), columns)

  if (rowIndex < (json as Array<unknown>).length - 1) {
    const nextPosition = { rowIndex: rowIndex + 1, columnIndex }
    const nextPath = fromTableCellPosition(nextPosition, columns)
    return createValueSelection(nextPath)
  }

  return selection
}

export function selectPreviousColumn(columns: JSONPath[], selection: JSONSelection): JSONSelection {
  const { rowIndex, columnIndex } = toTableCellPosition(getFocusPath(selection), columns)

  if (columnIndex > 0) {
    const previousPosition = { rowIndex, columnIndex: columnIndex - 1 }
    const previousPath = fromTableCellPosition(previousPosition, columns)
    return createValueSelection(previousPath)
  }

  return selection
}

export function selectNextColumn(columns: JSONPath[], selection: JSONSelection): JSONSelection {
  const { rowIndex, columnIndex } = toTableCellPosition(getFocusPath(selection), columns)

  if (columnIndex < columns.length - 1) {
    const nextPosition = { rowIndex, columnIndex: columnIndex + 1 }
    const nextPath = fromTableCellPosition(nextPosition, columns)
    return createValueSelection(nextPath)
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
    containsNumber(validationError.path[0])
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
          return stringifyJSONPath(error.path) + ' ' + error.message
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
  sortedColumn: SortedColumn | undefined,
  operations: JSONPatchOperation[],
  columms: JSONPath[]
): SortedColumn | undefined {
  const mustBeCleared = operations.some((operation) =>
    operationAffectsSortedColumn(sortedColumn, operation, columms)
  )

  return mustBeCleared ? undefined : sortedColumn
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
export function findNestedArrays(json: unknown, maxLevel = 2): JSONPath[] {
  const props: JSONPath[] = []

  function recurse(value: unknown, path: JSONPath) {
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
