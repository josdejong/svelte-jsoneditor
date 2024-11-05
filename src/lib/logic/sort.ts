import diffSequence from '../generated/diffSequence.js'
import type { JSONPatchDocument, JSONPatchOperation, JSONPath } from 'immutable-json-patch'
import {
  compileJSONPointer,
  getIn,
  isJSONArray,
  isJSONPatchCopy,
  isJSONPatchMove,
  parseFrom,
  parsePath,
  setIn
} from 'immutable-json-patch'
import { first, initial, isEmpty, isEqual, last } from 'lodash-es'
import naturalCompare from 'natural-compare-lite'
import { int } from '../utils/numberUtils.js'
import { isObject } from '../utils/typeUtils.js'

export function caseInsensitiveNaturalCompare(a: unknown, b: unknown) {
  const aLower = typeof a === 'string' ? a.toLowerCase() : a
  const bLower = typeof b === 'string' ? b.toLowerCase() : b

  return naturalCompare(aLower, bLower)
}

/**
 * Sort a JSON object or array
 * @param json           The the JSON containing the (optionally nested)
 *                       object to be sorted
 * @param [rootPath=[]]  Relative path when the array was located
 * @param [itemPath=[]]  Item path by which to sort items in case of an array
 * @param [direction=1]  Pass 1 to sort ascending, -1 to sort descending
 * @return               Returns a JSONPatch document with move operation
 *                       to get the array sorted.
 */
export function sortJson(
  json: unknown,
  rootPath: JSONPath = [],
  itemPath: JSONPath = [],
  direction: 1 | -1 = 1
): JSONPatchDocument {
  const value = getIn(json, rootPath)

  if (isJSONArray(value)) {
    if (itemPath === undefined) {
      throw new Error('Cannot sort: no property selected by which to sort the array')
    }

    return sortArray(json, rootPath, itemPath, direction)
  }

  if (isObject(value)) {
    return sortObjectKeys(json, rootPath, direction)
  }

  throw new Error('Cannot sort: no array or object')
}

/**
 * Sort the keys of an object
 * @param json           The the JSON containing the (optionally nested)
 *                       object to be sorted
 * @param [rootPath=[]]  Relative path when the array was located
 * @param [direction=1]  Pass 1 to sort ascending, -1 to sort descending
 * @return               Returns a JSONPatch document with operations
 *                       to get the array sorted.
 */
export function sortObjectKeys(
  json: unknown,
  rootPath: JSONPath = [],
  direction: 1 | -1 = 1
): JSONPatchDocument {
  const object = getIn(json, rootPath) as Record<string, unknown>
  const keys = Object.keys(object as unknown as Record<string, unknown>)
  const sortedKeys = keys.slice()

  sortedKeys.sort((keyA, keyB) => {
    return direction * caseInsensitiveNaturalCompare(keyA, keyB)
  })

  // for performance reasons, do a full replace (we could also create a move operation for every key)
  const sortedObject: Record<string, unknown> = {}
  sortedKeys.forEach((key) => (sortedObject[key] = object[key]))

  return [
    {
      op: 'replace',
      path: compileJSONPointer(rootPath),
      value: sortedObject
    }
  ]
}

/**
 * Sort the items of an array
 * @param json               The document containing (optionally nested)
 *                           the array to be sorted.
 * @param [rootPath=[]]      Relative path when the array was located
 * @param [propertyPath=[]]  Nested path to the property on which to sort the contents
 * @param [direction=1]      Pass 1 to sort ascending, -1 to sort descending
 * @return                   Returns a JSONPatch document with move operation
 *                           to get the array sorted.
 */
export function sortArray(
  json: unknown,
  rootPath: JSONPath = [],
  propertyPath: JSONPath = [],
  direction: 1 | -1 = 1
): JSONPatchDocument {
  const comparator = createObjectComparator(propertyPath, direction)

  // TODO: make the mechanism to sort configurable? Like use sortOperationsMove and sortOperationsMoveAdvanced
  const array = getIn(json, rootPath) as Array<unknown>
  return [
    {
      op: 'replace',
      path: compileJSONPointer(rootPath),
      value: array.slice(0).sort(comparator)
    }
  ]
}

/**
 * Create a comparator function to compare nested properties in an array
 */
function createObjectComparator(propertyPath: JSONPath, direction: 1 | -1) {
  return function comparator(a: unknown, b: unknown) {
    const valueA = getIn(a, propertyPath)
    const valueB = getIn(b, propertyPath)

    if (valueA === undefined) {
      return direction
    }
    if (valueB === undefined) {
      return -direction
    }

    if (typeof valueA !== 'string' && typeof valueB !== 'string') {
      // both values are a number, boolean, or null -> use simple, fast sorting
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return valueA > valueB ? direction : valueA < valueB ? -direction : 0
    }

    return direction * caseInsensitiveNaturalCompare(valueA, valueB)
  }
}

/**
 * Create a list with JSON Patch move operations
 * needed to sort the array contents.
 */
export function sortOperationsMove<T>(
  array: T[],
  comparator: (a: T, b: T) => number
): JSONPatchOperation[] {
  const operations: JSONPatchOperation[] = []
  const sorted = []

  // TODO: rewrite the function to pass a callback instead of returning an array?
  for (let i = 0; i < array.length; i++) {
    // TODO: can we simplify the following code?
    const item = array[i]
    if (i > 0 && comparator(sorted[i - 1], item) > 0) {
      let j = i - 1
      while (j > 0 && comparator(sorted[j - 1], item) > 0) {
        j--
      }

      operations.push({
        op: 'move',
        from: '/' + i,
        path: '/' + j
      })

      sorted.splice(j, 0, item)
    } else {
      sorted.push(item)
    }
  }

  return operations
}

/**
 * Create an array containing all move operations
 * needed to sort the array contents.
 */
export function sortOperationsMoveAdvanced<T>(
  array: T[],
  comparator: (a: T, b: T) => number
): JSONPatchOperation[] {
  const moves: { from: number; to: number }[] = []

  const sortedIndices = array
    .map((item, index) => ({ item, index }))
    .sort((a, b) => comparator(a.item, b.item))
    .map((entry) => entry.index)

  let bIndex = 0

  function foundSubsequence(nCommon: number, aCommon: number, bCommon: number) {
    for (let b = bIndex; b < bCommon; b++) {
      moves.push({
        from: sortedIndices[b],
        to: aCommon
      })
    }

    bIndex = bCommon + nCommon
  }

  const size = array.length

  function isCommon(aIndex: number, bIndex: number) {
    return aIndex === sortedIndices[bIndex]
  }

  diffSequence(size, size, isCommon, foundSubsequence)
  foundSubsequence(0, size, size)

  // every move will change the actual indices, so we've to adjust for that
  // in all moves that still have to be executed
  for (let i = 0; i < moves.length; i++) {
    if (moves[i].to > moves[i].from) {
      moves[i].to--
    }

    const { from, to } = moves[i]

    for (let j = i + 1; j < moves.length; j++) {
      const other = moves[j]
      if (other.from >= from) {
        other.from--
      }
      if (other.to >= from) {
        other.to--
      }
      if (other.from >= to) {
        other.from++
      }
      if (other.to >= to) {
        other.to++
      }
    }
  }

  return moves.map(({ from, to }) => {
    return {
      op: 'move',
      from: '/' + from,
      path: '/' + to
    }
  })
}

/**
 * Fast solution to apply many JSON patch move operations inside a single array,
 * like applying all moves needed to sort an array.
 *
 * Throws an error when not all operations are move operation inside the same
 * array.
 */
// TODO: write unit tests
export function fastPatchSort(json: unknown, operations: JSONPatchDocument): unknown {
  if (isEmpty(operations)) {
    // nothing to do :)
    return json
  }

  // validate whether all operations are "move" operations
  const invalidOp = operations.find((operation) => {
    return operation.op !== 'move'
  })
  if (invalidOp) {
    throw new Error(
      'Cannot apply fastPatchSort: not a "move" operation ' +
        '(actual: ' +
        JSON.stringify(invalidOp) +
        ')'
    )
  }

  // parse all paths
  const parsedOperations: Array<{ from: JSONPath | undefined; path: JSONPath }> = operations.map(
    (operation) => ({
      from:
        isJSONPatchCopy(operation) || isJSONPatchMove(operation)
          ? parseFrom(operation.from)
          : undefined,
      path: parsePath(json, operation.path)
    })
  )

  // validate whether the move actions take place in an array
  const arrayPath = initial(first(parsedOperations)?.path)
  const array = getIn(json, arrayPath)
  if (!Array.isArray(array)) {
    throw new Error(
      'Cannot apply fastPatchSort: not an Array ' + '(path: ' + JSON.stringify(arrayPath) + ')'
    )
  }

  // validate whether all paths are in the same array
  const invalidPath = parsedOperations.find((parsedOperation) => {
    return (
      !isEqual(arrayPath, initial(parsedOperation.path)) ||
      !isEqual(arrayPath, initial(parsedOperation.from))
    )
  })
  if (invalidPath) {
    throw new Error(
      'Cannot apply fastPatchSort: not all move operations are in the same array ' +
        '(expected: ' +
        JSON.stringify(arrayPath) +
        ', actual: ' +
        JSON.stringify(invalidPath) +
        ')'
    )
  }

  // apply the actual operations on the same array. Only copy the only array once
  const updatedArray = array.slice(0)
  parsedOperations.forEach((parsedOperation) => {
    const toIndex = int(last(parsedOperation.path) || '-1')
    const fromIndex = int(last(parsedOperation.from) || '-1')

    const value = updatedArray.splice(fromIndex, 1)[0]
    updatedArray.splice(toIndex, 0, value)
  })

  return setIn(json, arrayPath, updatedArray)
}
