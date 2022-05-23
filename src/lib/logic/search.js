import { compileJSONPointer, existsIn, getIn, setIn } from 'immutable-json-patch'
import { forEachRight, initial, isEqual, last } from 'lodash-es'
import {
  STATE_ENFORCE_STRING,
  STATE_KEYS,
  STATE_SEARCH_PROPERTY,
  STATE_SEARCH_VALUE
} from '../constants.js'
import { getKeys } from './documentState.js'
import { createSelectionFromOperations } from './selection.js'
import { rename } from './operations.js'
import { stringConvert } from '../utils/typeUtils.ts'

// TODO: comment
export function updateSearchResult(json, flatResults, previousResult) {
  const flatItems = flatResults

  const items = createRecursiveSearchResults(json, flatItems)

  const activePath =
    previousResult && previousResult.activeItem
      ? getNestedSearchResultPath(previousResult.activeItem)
      : undefined
  const activeItem =
    activePath && existsIn(items, activePath) ? getIn(items, activePath) : flatItems[0]

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
    activeIndex
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

  function onMatch(match) {
    if (results.length < maxResults) {
      results.push(match)
    }
  }

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

        findCaseInsensitiveMatches(key, searchTextLowerCase, path, STATE_SEARCH_PROPERTY, onMatch)

        searchRecursive(searchTextLowerCase, json[key], state ? state[key] : undefined)

        if (results.length >= maxResults) {
          return
        }
      }

      path.pop()
    } else {
      // type is a value
      findCaseInsensitiveMatches(json, searchTextLowerCase, path, STATE_SEARCH_VALUE, onMatch)
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
 * @param {(searchResultItem: SearchResultItem) => void} onMatch
 */
export function findCaseInsensitiveMatches(text, searchTextLowerCase, path, field, onMatch) {
  const textLower = String(text).toLowerCase()

  let fieldIndex = 0
  let position = -1
  let index = -1

  do {
    index = textLower.indexOf(searchTextLowerCase, position)

    if (index !== -1) {
      position = index + searchTextLowerCase.length

      onMatch({
        path: path.slice(0), // path may be mutated in a later stage, therefore we store a copy
        field,
        fieldIndex,
        start: index,
        end: position,
        active: false
      })

      fieldIndex++
    }
  } while (index !== -1)
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
 * Replace all matches with a replacement text
 * @param {string} text
 * @param {string} replacementText
 * @param {Array<{start: number, end: number}>} occurrences
 * @return {string}
 */
export function replaceAllText(text, replacementText, occurrences) {
  let updatedText = text

  forEachRight(occurrences, (occurrence) => {
    updatedText = replaceText(updatedText, replacementText, occurrence.start, occurrence.end)
  })

  return updatedText
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
    const newSelection = createSelectionFromOperations(json, state, operations)

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
    const currentValueText = typeof currentValue === 'string' ? currentValue : String(currentValue)

    const enforceString = getIn(state, path.concat([STATE_ENFORCE_STRING])) || false

    const value = replaceText(currentValueText, replacementText, start, end)

    const operations = [
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value: enforceString ? value : stringConvert(value)
      }
    ]

    const newSelection = createSelectionFromOperations(json, state, operations)

    return {
      newSelection,
      operations
    }
  } else {
    throw new Error(`Cannot replace: unknown type of search result field ${field}`)
  }
}

/**
 * @param {JSON} json
 * @param {JSON} state
 * @param {string} searchText
 * @param {string} replacementText
 * @returns {{newSelection: Selection, operations: JSONPatchDocument}}
 */
export function createSearchAndReplaceAllOperations(json, state, searchText, replacementText) {
  // TODO: to improve performance, we could reuse existing search results (except when hitting a maxResult limit)
  const searchResultItems = search(searchText, json, state, Infinity /* maxResults */)

  // step 1: deduplicate matches inside the same field/value
  // (filter, map, and group)
  const deduplicatedMatches = []
  for (let i = 0; i < searchResultItems.length; i++) {
    const previousItem = searchResultItems[i - 1]
    const item = searchResultItems[i]
    if (i === 0 || item.field !== previousItem.field || !isEqual(item.path, previousItem.path)) {
      deduplicatedMatches.push({
        path: item.path,
        field: item.field,
        items: [item]
      })
    } else {
      last(deduplicatedMatches).items.push(item)
    }
  }

  // step 2: sort from deepest nested to least nested
  // this is needed to replace in that order because paths may change
  // if there are replacements in keys
  deduplicatedMatches.sort((a, b) => {
    // sort values first, properties next
    if (a.field !== b.field) {
      if (a.field === STATE_SEARCH_PROPERTY) {
        return 1
      } else {
        return -1
      }
    }

    // sort longest paths first, shortest last
    return b.path.length - a.path.length
  })

  // step 3: call createSearchAndReplaceOperations for each of the matches
  let allOperations = []
  let lastNewSelection = undefined
  deduplicatedMatches.forEach((match) => {
    // TODO: there is overlap with the logic of createSearchAndReplaceOperations. Can we extract and reuse this logic?
    const { field, path, items } = match

    if (field === STATE_SEARCH_PROPERTY) {
      // replace a key
      const parentPath = initial(path)
      const oldKey = last(path)
      const keys = getKeys(state, parentPath)
      const newKey = replaceAllText(oldKey, replacementText, items)

      const operations = rename(parentPath, keys, oldKey, newKey)
      allOperations = allOperations.concat(operations)

      lastNewSelection = createSelectionFromOperations(json, state, operations)
    } else if (field === STATE_SEARCH_VALUE) {
      // replace a value
      const currentValue = getIn(json, path)
      if (currentValue === undefined) {
        throw new Error(`Cannot replace: path not found ${compileJSONPointer(path)}`)
      }
      const currentValueText =
        typeof currentValue === 'string' ? currentValue : String(currentValue)

      const enforceString = getIn(state, path.concat([STATE_ENFORCE_STRING])) || false

      const value = replaceAllText(currentValueText, replacementText, items)

      const operations = [
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: enforceString ? value : stringConvert(value)
        }
      ]
      allOperations = allOperations.concat(operations)

      lastNewSelection = createSelectionFromOperations(json, state, operations)
    } else {
      throw new Error(`Cannot replace: unknown type of search result field ${field}`)
    }
  })

  return {
    operations: allOperations,
    newSelection: lastNewSelection
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
