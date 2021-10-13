import { compileJSONPointer, existsIn, getIn, setIn } from 'immutable-json-patch'
import { initial, isEqual, last } from 'lodash-es'
import { STATE_KEYS, STATE_SEARCH_PROPERTY, STATE_SEARCH_VALUE } from '../constants.js'
import { pushLimited } from '../utils/arrayUtils.js'
import { getKeys } from './documentState.js'
import { createSelectionFromOperations } from './selection.js'
import { rename } from './operations.js'

/**
 * @typedef {Object} SearchResult
 * @property {Object} items
 * @property {Object} itemsWithActive
 * @property {Path[]} flatItems
 * @property {Path} activeItem
 * @property {number} activeIndex
 * @property {number} count
 */

/**
 * @typedef {Object} SearchResultItem
 * @property {Path} path
 * @property {Symbol} field
 * @property {number} fieldIndex
 * @property {number} start
 * @property {number} end
 */

// TODO: comment
export function updateSearchResult(json, flatResults, previousResult) {
  const flatItems = flatResults

  const items = createRecursiveSearchResults(json, flatItems)

  const activeItem =
    previousResult &&
    previousResult.activeItem &&
    existsIn(items, getNestedSearchResultPath(previousResult.activeItem))
      ? previousResult.activeItem
      : flatItems[0]

  const activeIndex = flatItems.findIndex((item) =>
    hasEqualSearchResultItemPointer(item, activeItem)
  )

  const itemsWithActive =
    items && activeItem && activeIndex !== -1
      ? setIn(items, getActiveItemPropertyPath(activeItem), true)
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

/**
 * @param {JSON} referenceJson
 * @param {SearchResultItem[]} flatResults
 * @returns {{}}
 */
export function createRecursiveSearchResults(referenceJson, flatResults) {
  // TODO: smart update result based on previous results to make the results immutable when there is no actual change
  let result = {}

  flatResults.forEach((searchResultItem) => {
    const path = searchResultItem.path

    // when the path is an array, we'll add a symbol on the array, but then
    // setIn has no information to determine whether to create an array or an
    // object, so we do that here explicitly based on referenceJson
    if (!existsIn(result, path)) {
      const item = getIn(referenceJson, path)
      result = setIn(result, path, Array.isArray(item) ? [] : {}, true)
    }

    result = setIn(result, getNestedSearchResultPath(searchResultItem), searchResultItem, true)
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
    ? setIn(searchResult.items, getActiveItemPropertyPath(nextActiveItem), true, true)
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
    ? setIn(searchResult.items, getActiveItemPropertyPath(previousActiveItem), true, true)
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

        const matches = findCaseInsensitiveMatches(
          key,
          searchTextLowerCase,
          path.slice(0),
          STATE_SEARCH_PROPERTY
        )
        if (matches !== undefined) {
          pushLimited(results, matches, maxResults)
        }

        searchRecursive(searchTextLowerCase, json[key], state ? state[key] : undefined)

        if (results.length >= maxResults) {
          return
        }
      }

      path.pop()
    } else {
      // type is a value
      const matches = findCaseInsensitiveMatches(
        json,
        searchTextLowerCase,
        path.slice(0),
        STATE_SEARCH_VALUE
      )
      if (matches !== undefined) {
        pushLimited(results, matches, maxResults)
      }
    }
  }

  if (typeof searchText === 'string' && searchText !== '') {
    const searchTextLowerCase = searchText.toLowerCase()
    searchRecursive(searchTextLowerCase, json, state)
  }

  return results
}

/**
 * Do a case insensitive search for a search text in a text
 * @param {String} text
 * @param {String} searchTextLowerCase
 * @param {Path} path
 * @param {Symbol} field
 * @return {SearchResultItem[] | undefined} Returns a list with all matches if any, or null when there are no matches
 */
export function findCaseInsensitiveMatches(text, searchTextLowerCase, path, field) {
  const textLower = String(text).toLowerCase()

  let matches = undefined
  let position = -1
  let index = -1

  do {
    index = textLower.indexOf(searchTextLowerCase, position)

    if (index !== -1) {
      position = index + searchTextLowerCase.length

      if (!Array.isArray(matches)) {
        matches = []
      }

      const fieldIndex = matches.length
      matches.push({
        path,
        field,
        fieldIndex,
        start: index,
        end: position,
        active: false
      })
    }
  } while (index !== -1)

  return matches
}

/**
 * Replace a search result item with a replacement text
 * @param {string} text
 * @param {string} replacementText
 * @param {number} start
 * @param {number} end
 */
export function replaceText(text, replacementText, start, end) {
  return text.substring(0, start) + replacementText + text.substring(end)
}

/**
 * @param {JSON} json
 * @param {JSON} state
 * @param {string} replacementText
 * @param {SearchResultItem} searchResultItem
 * @returns {{newSelection: Selection, operations: JSONPatchDocument}}
 */
export function createSearchAndReplaceOperations(json, state, replacementText, searchResultItem) {
  const { field, path, start, end } = searchResultItem

  if (field === STATE_SEARCH_PROPERTY) {
    // replace a key
    const parentPath = initial(path)
    const oldKey = last(path)
    const keys = getKeys(state, parentPath)
    const newKey = replaceText(oldKey, replacementText, start, end)

    const operations = rename(parentPath, keys, oldKey, newKey)
    const newSelection = createSelectionFromOperations(json, operations)

    return {
      newSelection,
      operations
    }
  } else if (field === STATE_SEARCH_VALUE) {
    // replace a value
    const currentValue = getIn(json, path)
    if (currentValue === undefined) {
      throw new Error(`Cannot replace: path not found ${compileJSONPointer(path)}`)
    }

    const value = replaceText(currentValue, replacementText, start, end)

    const operations = [
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value
      }
    ]

    const newSelection = createSelectionFromOperations(json, operations)

    return {
      newSelection,
      operations
    }
  } else {
    throw new Error(`Cannot replace: unknown type of search result field ${field}`)
  }
}

/**
 * Split the text into separate parts for each search result and the text
 * in between.
 * @param {string} text
 * @param {SearchResultItem[]} matches
 * @return {Array<{text: string, type: 'normal' | 'highlight', active: boolean}>}
 */
export function splitValue(text, matches) {
  const parts = []

  let previousEnd = 0

  for (const match of matches) {
    const precedingText = text.slice(previousEnd, match.start)
    if (precedingText !== '') {
      parts.push({
        type: 'normal',
        text: precedingText,
        active: false
      })
    }

    const matchingText = text.slice(match.start, match.end)
    parts.push({
      type: 'highlight',
      text: matchingText,
      active: match.active
    })

    previousEnd = match.end
  }

  const lastMatch = last(matches)
  if (lastMatch.end < text.length) {
    parts.push({
      type: 'normal',
      text: text.slice(lastMatch.end),
      active: false
    })
  }

  return parts
}

/**
 * Get the path of the .active property on a nested search result
 * @param {SearchResultItem} activeItem
 * @return {Path}
 */
function getActiveItemPropertyPath(activeItem) {
  return activeItem.path.concat(activeItem.field, activeItem.fieldIndex, 'active')
}

/**
 * Get the path of the search result property on a nested search result
 * @param {SearchResultItem} searchResultItem
 * @return {Path}
 */
function getNestedSearchResultPath(searchResultItem) {
  return searchResultItem.path.concat(searchResultItem.field, searchResultItem.fieldIndex)
}

/**
 * @param {SearchResultItem} a
 * @param {SearchResultItem} b
 * @return {boolean}
 */
function hasEqualSearchResultItemPointer(a, b) {
  // we must NOT compare .fieldIndex or .active
  // TODO: refactor the data models so fieldIndex is not part of it?

  // we also don't compare end, so we will keep the search result focus whilst typing in the search box
  return a.start === b.start && a.field === b.field && isEqual(a.path, b.path)
}
