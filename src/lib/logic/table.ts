import type { JSONPath } from 'immutable-json-patch'
import type { JSONArray } from 'immutable-json-patch'
import { first, isEmpty } from 'lodash-es'

// TODO: unit test
export function getColumns(json: JSONArray): JSONPath[] {
  // TODO: create columns for nested objects
  // FIXME: should iterate over the whole object?
  return Object.keys(first(json)).map((key) => [key])
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
  items: JSONArray,
  itemHeights: Record<number, number>,
  defaultItemHeight: number
): VisibleSection {
  const itemCount = Array.isArray(items) ? items.length : 0
  const averageItemHeight = calculateAverageItemHeight(itemHeights, defaultItemHeight)

  const viewPortTop = scrollTop
  let startIndex = 0
  let startHeight = 0
  while (startHeight < viewPortTop && startIndex < items.length) {
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

  const visibleItems = Array.isArray(items) ? items.slice(startIndex, endIndex) : []

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
