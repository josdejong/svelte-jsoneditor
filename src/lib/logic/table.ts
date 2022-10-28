import type { JSONArray, JSONPath, JSONValue } from 'immutable-json-patch'
import {
  compileJSONPointer,
  isJSONArray,
  isJSONObject,
  parseJSONPointer
} from 'immutable-json-patch'
import { isEmpty } from 'lodash-es'

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