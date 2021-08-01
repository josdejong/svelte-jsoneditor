import { existsIn, getIn, setIn } from 'immutable-json-patch'
import { initial, isEqual } from 'lodash-es'
import {
  ACTIVE_SEARCH_RESULT,
  SEARCH_RESULT,
  STATE_KEYS,
  STATE_SEARCH_PROPERTY,
  STATE_SEARCH_VALUE
} from '../constants.js'

/**
 * @typedef {Object} SearchResult
 * @property {Object} items
 * @property {Object} itemsWithActive
 * @property {Path[]} flatItems
 * @property {Path} activeItem
 * @property {number} activeIndex
 * @property {number} count
 */

// TODO: comment
export function updateSearchResult(json, flatResults, previousResult) {
  const flatItems = flatResults

  const items = createRecursiveSearchResults(json, flatItems)

  const activeItem =
    previousResult && previousResult.activeItem && existsIn(items, previousResult.activeItem)
      ? previousResult.activeItem
      : flatItems[0]

  const activeIndex = flatItems.findIndex((item) => isEqual(item, activeItem))

  const itemsWithActive =
    items && activeItem && activeIndex !== -1
      ? setIn(items, activeItem, ACTIVE_SEARCH_RESULT)
      : items

  return {
    items,
    itemsWithActive,
    flatItems,
    count: flatItems.length,
    activeItem,
    activeIndex: activeIndex
  }
}

// TODO: comment
export function createRecursiveSearchResults(referenceJson, flatResults) {
  // TODO: smart update result based on previous results to make the results immutable when there is no actual change
  let result = {}

  flatResults.forEach((path) => {
    const parentPath = initial(path)
    if (!existsIn(result, parentPath)) {
      const item = getIn(referenceJson, parentPath)
      result = setIn(result, parentPath, Array.isArray(item) ? [] : {}, true)
    }

    result = setIn(result, path, SEARCH_RESULT)
  })

  return result
}

/**
 * @param {SearchResult} searchResult
 * @return {SearchResult}
 */
export function searchNext(searchResult) {
  const nextActiveIndex =
    searchResult.activeIndex < searchResult.flatItems.length - 1
      ? searchResult.activeIndex + 1
      : searchResult.flatItems.length > 0
      ? 0
      : -1

  const nextActiveItem = searchResult.flatItems[nextActiveIndex]

  const itemsWithActive = nextActiveItem
    ? setIn(searchResult.items, nextActiveItem, ACTIVE_SEARCH_RESULT, true)
    : searchResult.items

  return {
    ...searchResult,
    itemsWithActive,
    activeItem: nextActiveItem,
    activeIndex: nextActiveIndex
  }
}

/**
 * @param {SearchResult} searchResult
 * @return {SearchResult}
 */
export function searchPrevious(searchResult) {
  const previousActiveIndex =
    searchResult.activeIndex > 0 ? searchResult.activeIndex - 1 : searchResult.flatItems.length - 1

  const previousActiveItem = searchResult.flatItems[previousActiveIndex]

  const itemsWithActive = previousActiveItem
    ? setIn(searchResult.items, previousActiveItem, ACTIVE_SEARCH_RESULT, true)
    : searchResult.items

  return {
    ...searchResult,
    itemsWithActive,
    activeItem: previousActiveItem,
    activeIndex: previousActiveIndex
  }
}

// TODO: comment
export function search(searchText, json, state, maxResults = Infinity) {
  const results = []
  const path = [] // we reuse the same Array recursively, this is *much* faster than creating a new path every time

  function searchRecursive(searchTextLowerCase, json, state) {
    if (Array.isArray(json)) {
      const level = path.length
      path.push(0)

      for (let i = 0; i < json.length; i++) {
        path[level] = i

        searchRecursive(searchTextLowerCase, json[i], state ? state[i] : undefined)

        if (results.length >= maxResults) {
          return
        }
      }

      path.pop()
    } else if (json !== null && typeof json === 'object') {
      const level = path.length
      path.push(0)

      const keys = state ? state[STATE_KEYS] : Object.keys(json)

      for (const key of keys) {
        path[level] = key

        if (containsCaseInsensitive(key, searchTextLowerCase) && results.length < maxResults) {
          results.push(path.concat([STATE_SEARCH_PROPERTY]))
        }

        searchRecursive(searchTextLowerCase, json[key], state ? state[key] : undefined)

        if (results.length >= maxResults) {
          return
        }
      }

      path.pop()
    } else {
      // type is a value
      if (containsCaseInsensitive(json, searchTextLowerCase) && results.length < maxResults) {
        results.push(path.concat([STATE_SEARCH_VALUE]))
      }
    }
  }

  if (typeof searchText === 'string' && searchText !== '') {
    const searchTextLowerCase = searchText.toLowerCase()
    searchRecursive(searchTextLowerCase, json, state, [])
  }

  return results
}

/**
 * Do a case insensitive search for a search text in a text
 * @param {String} text
 * @param {String} searchTextLowerCase
 * @return {boolean} Returns true if `search` is found in `text`
 */
export function containsCaseInsensitive(text, searchTextLowerCase) {
  return String(text).toLowerCase().indexOf(searchTextLowerCase) !== -1
}
