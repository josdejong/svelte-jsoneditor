import { initial, isEqual } from 'lodash-es'
import {
  ACTIVE_SEARCH_RESULT,
  SEARCH_RESULT,
  STATE_KEYS,
  STATE_SEARCH_PROPERTY,
  STATE_SEARCH_VALUE
} from '../constants.js'
import { existsIn, getIn, setIn } from 'immutable-json-patch'

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
export function updateSearchResult (json, flatResults, previousResult) {
  const flatItems = flatResults

  const items = createRecursiveSearchResults(json, flatItems)

  const activeItem = (previousResult && previousResult.activeItem &&
    existsIn(items, previousResult.activeItem))
    ? previousResult.activeItem
    : flatItems[0]

  const activeIndex = flatItems.findIndex(item => isEqual(item, activeItem))

  const itemsWithActive = (items && activeItem && activeIndex !== -1)
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
export function createRecursiveSearchResults (referenceJson, flatResults) {
  // TODO: smart update result based on previous results to make the results immutable when there is no actual change
  let result = {}

  flatResults.forEach(path => {
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
export function searchNext (searchResult) {
  const nextActiveIndex = searchResult.activeIndex < searchResult.flatItems.length - 1
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
export function searchPrevious (searchResult) {
  const previousActiveIndex = searchResult.activeIndex > 0
    ? searchResult.activeIndex - 1
    : searchResult.flatItems.length - 1

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

async function tick () {
  return new Promise(setTimeout)
}

// TODO: comment
export function searchAsync (searchText, json, state, { onProgress, onDone, maxResults = Infinity, yieldAfterItemCount = 10000 }) {
  // TODO: what is a good value for yieldAfterItemCount? (larger means faster results but also less responsive during search)
  const search = searchGenerator(searchText, json, state, yieldAfterItemCount)

  let cancelled = false
  const results = []
  let newResults = false

  async function executeSearch () {
    if (!searchText || searchText === '') {
      onDone(results)
      return
    }

    let next
    do {
      next = search.next()
      if (next.value) {
        if (results.length < maxResults) {
          results.push(next.value) // TODO: make this immutable?
          newResults = true
        } else {
          // max results limit reached
          cancelled = true
          onDone(results)
        }
      } else {
        // time for a small break, give the browser space to do stuff
        if (newResults) {
          newResults = false
          if (onProgress) {
            onProgress(results)
          }
        }

        await tick()
      }

      // eslint-disable-next-line no-unmodified-loop-condition
    } while (!cancelled && !next.done)

    if (next.done) {
      onDone(results)
    } // else: cancelled
  }

  // start searching on the next tick
  setTimeout(executeSearch)

  return {
    cancel: () => {
      cancelled = true
    }
  }
}

// TODO: comment
export function * searchGenerator (searchText, json, state = undefined, yieldAfterItemCount = undefined) {
  let count = 0

  function * incrementCounter () {
    count++
    if (typeof yieldAfterItemCount === 'number' && count % yieldAfterItemCount === 0) {
      // pause every x items
      yield null
    }
  }

  function * searchRecursiveAsync (searchTextLowerCase, json, state, path) {
    if (Array.isArray(json)) {
      for (let i = 0; i < json.length; i++) {
        yield * searchRecursiveAsync(searchTextLowerCase, json[i], state ? state[i] : undefined, path.concat([i]))
      }
    } else if (json !== null && typeof json === 'object') {
      const keys = state
        ? state[STATE_KEYS]
        : Object.keys(json)

      for (const key of keys) {
        if (typeof key === 'string' && containsCaseInsensitive(key, searchTextLowerCase)) {
          yield path.concat([key, STATE_SEARCH_PROPERTY])
        }
        yield * incrementCounter()

        yield * searchRecursiveAsync(searchTextLowerCase, json[key], state ? state[key] : undefined, path.concat([key]))
      }
    } else { // type is a value
      if (containsCaseInsensitive(json, searchTextLowerCase)) {
        yield path.concat([STATE_SEARCH_VALUE])
      }
      yield * incrementCounter()
    }
  }

  const searchTextLowerCase = searchText.toLowerCase()

  return yield * searchRecursiveAsync(searchTextLowerCase, json, state, [])
}

// TODO: comment
export function search (searchText, json, state) {
  const results = []
  const path = [] // we reuse the same Array recursively, this is *much* faster than creating a new path every time

  function searchRecursive (searchTextLowerCase, json, state) {
    if (Array.isArray(json)) {
      const level = path.length
      path.push(0)

      for (let i = 0; i < json.length; i++) {
        path[level] = i
        searchRecursive(searchTextLowerCase, json[i], state ? state[i] : undefined)
      }

      path.pop()
    } else if (json !== null && typeof json === 'object') {
      const level = path.length
      path.push(0)

      const keys = state
        ? state[STATE_KEYS]
        : Object.keys(json)

      for (const key of keys) {
        path[level] = key

        if (containsCaseInsensitive(key, searchTextLowerCase)) {
          results.push(path.concat([STATE_SEARCH_PROPERTY]))
        }

        searchRecursive(searchTextLowerCase, json[key], state ? state[key] : undefined)
      }

      path.pop()
    } else { // type is a value
      if (containsCaseInsensitive(json, searchTextLowerCase)) {
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
export function containsCaseInsensitive (text, searchTextLowerCase) {
  return String(text).toLowerCase().indexOf(searchTextLowerCase) !== -1
}
