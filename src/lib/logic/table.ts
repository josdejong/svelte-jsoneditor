import type { JSONArray, JSONPath, JSONValue } from 'immutable-json-patch'
import {
  compileJSONPointer,
  isJSONArray,
  isJSONObject,
  parseJSONPointer
} from 'immutable-json-patch'
import { groupBy, isEmpty, mapValues, partition } from 'lodash-es'
import type { JSONSelection, TableCellIndex, ValidationError } from '../types.js'
import { createValueSelection, pathStartsWith } from './selection.js'
import { isNumber } from '../utils/numberUtils.js'
import type { Dictionary } from 'lodash'
import { stringifyJSONPath, stripRootObject } from '../utils/pathUtils.js'
import { ValidationSeverity } from '../types.js'

export function getColumns(
  array: JSONArray,
  flatten: boolean,
  maxLookupCount = Math.min(isJSONArray(array) ? array.length : 0, 100)
): JSONPath[] {
  const compiledPaths = new Set()

  for (let i = 0; i < maxLookupCount; i++) {
    const paths: JSONPath[] = flatten ? getRecursiveKeys(array[i]) : getShallowKeys(array[i])

    paths.forEach((path) => compiledPaths.add(compileJSONPointer(path)))
  }

  return Array.from(compiledPaths).map(parseJSONPointer)
}

export function getShallowKeys(value: JSONValue): JSONPath[] {
  return isJSONObject(value) ? Object.keys(value).map((key) => [key]) : [[]]
}

export function getRecursiveKeys(value: JSONValue): JSONPath[] {
  const paths = []

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
  defaultItemHeight: number
): VisibleSection {
  const itemCount = isJSONArray(json) ? json.length : 0
  const averageItemHeight = calculateAverageItemHeight(itemHeights, defaultItemHeight)

  const viewPortTop = scrollTop
  let startIndex = 0
  let startHeight = 0
  while (startHeight < viewPortTop && startIndex < itemCount) {
    startHeight += itemHeights[startIndex] || defaultItemHeight
    startIndex++
  }
  if (startIndex > 0) {
    // go one item back, else there is white space at the top for up to 1 missing item
    startIndex--
    startHeight -= itemHeights[startIndex] || defaultItemHeight
  }

  let endIndex = startIndex
  let visibleHeight = 0
  while (visibleHeight < viewPortHeight && endIndex < itemCount) {
    visibleHeight += itemHeights[endIndex] || defaultItemHeight
    endIndex++
  }

  let endHeight = 0
  for (let i = endIndex; i < itemCount; i++) {
    endHeight += itemHeights[i] || defaultItemHeight
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

function calculateAverageItemHeight(
  itemHeights: Record<number, number>,
  defaultItemHeight: number
): number {
  const values = Object.values(itemHeights) // warning: itemHeights is mutated and not updated itself, we can't watch it!
  if (isEmpty(values)) {
    return defaultItemHeight
  }

  const add = (a, b) => a + b
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

  return {
    rowIndex: parseInt(index, 10),
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
        // TODO: handle the error "must have required property 'id'" -> find the columnIndex from that message

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
  return toTableCellPosition(error.path, columns).columnIndex
}
