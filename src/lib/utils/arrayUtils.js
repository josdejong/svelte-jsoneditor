import { isObject } from './typeUtils.js'
import { compileJSONPointer, parseJSONPointer } from 'immutable-json-patch'

const MAX_ITEM_PATHS_COLLECTION = 10000
const EMPTY_ARRAY = []

/**
 * Comparator to sort an array in ascending order
 *
 * Usage:
 *     [4,2,5].sort(compareAsc)    // [2,4,5]
 *
 * @param a
 * @param b
 * @return {number}
 */
export function compareAsc(a, b) {
  return a > b ? 1 : a < b ? -1 : 0
}

/**
 * Comparator to sort an array in ascending order
 *
 * Usage:
 *     [4,2,5].sort(compareDesc)   // [5,4,2]
 *
 * @param a
 * @param b
 * @return {number}
 */
export function compareDesc(a, b) {
  return a > b ? -1 : a < b ? 1 : 0
}

/**
 * Test whether all items of an array are strictly equal
 * @param {Array} a
 * @param {Array} b
 */
export function strictShallowEqual(a, b) {
  if (a.length !== b.length) {
    return false
  }

  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) {
      return false
    }
  }

  return true
}

export function compareArrays(a, b) {
  const minLength = Math.min(a.length, b.length)

  for (let i = 0; i < minLength; i++) {
    if (a[i] < b[i]) {
      return -1
    }

    if (a[i] > b[i]) {
      return 1
    }
  }

  return a.length - b.length
}

/**
 * Get the paths of all nested properties in the items of an array
 * @param {JSON} array
 * @param {boolean} [includeObjects=false] If true, object and array paths are returned as well
 * @return {Path[]}
 */
export function getNestedPaths(array, includeObjects = false) {
  const pathsMap = {}

  if (!Array.isArray(array)) {
    throw new TypeError('Array expected')
  }

  function recurseNestedPaths(obj, path) {
    const isValue = !Array.isArray(obj) && !isObject(obj)

    if (isValue || includeObjects) {
      pathsMap[compileJSONPointer(path)] = true
    }

    if (isObject(obj)) {
      Object.keys(obj).forEach((key) => {
        recurseNestedPaths(obj[key], path.concat(key))
      })
    }
  }

  const max = Math.min(array.length, MAX_ITEM_PATHS_COLLECTION)
  for (let i = 0; i < max; i++) {
    const item = array[i]
    recurseNestedPaths(item, EMPTY_ARRAY)
  }

  const pathsArray = Object.keys(pathsMap).sort()

  return pathsArray.map(parseJSONPointer)
}

/**
 * Invoke the callback with
 * @param {number} start   Included start index
 * @param {number} end       Excluded end index. End must be larger or equal to start
 * @param {function (index: number) : void} iteratee
 */
// TODO: write tests
export function forEachIndex(start, end, iteratee) {
  if (end <= start) {
    return
  }

  for (let index = start; index < end; index++) {
    iteratee(index)
  }
}

/**
 * Limit the number of items in an array
 * @param {Array} array
 * @param {number} max
 * @returns {Array}
 */
// TODO: write unit test
export function limit(array, max) {
  return array.length > max ? array.slice(0, max) : array
}
