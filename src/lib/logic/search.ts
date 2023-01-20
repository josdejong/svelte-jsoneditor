import type {
  JSONObject,
  JSONPatchDocument,
  JSONPatchOperation,
  JSONPath,
  JSONPointer,
  JSONValue
} from 'immutable-json-patch'
import { compileJSONPointer, getIn, isJSONArray, isJSONObject } from 'immutable-json-patch'
import { forEachRight, groupBy, initial, isEqual, last } from 'lodash-es'
import { getEnforceString } from './documentState.js'
import { createSelectionFromOperations } from './selection.js'
import { rename } from './operations.js'
import { stringConvert } from '../utils/typeUtils.js'
import type {
  DocumentState,
  ExtendedSearchResultItem,
  JSONParser,
  JSONPointerMap,
  JSONSelection,
  SearchResult,
  SearchResultItem
} from '$lib/types'
import { SearchField } from '$lib/types.js'

// TODO: comment
// TODO: unit test
export function updateSearchResult(
  json: JSONValue,
  newResultItems: SearchResultItem[],
  previousResult: SearchResult | undefined
): SearchResult {
  const activePath = previousResult?.activeItem
    ? getSearchResultPath(previousResult.activeItem)
    : undefined

  const matchingActiveIndex = newResultItems.findIndex((item) => {
    return isEqual(activePath, getSearchResultPath(item))
  })

  const activeIndex =
    matchingActiveIndex !== -1
      ? matchingActiveIndex
      : previousResult?.activeIndex < newResultItems.length
      ? previousResult?.activeIndex
      : newResultItems.length > 0
      ? 0
      : -1

  const items: ExtendedSearchResultItem[] = newResultItems.map((item, index) => {
    return { ...item, active: index === activeIndex }
  })

  const activeItem = items[activeIndex]

  return {
    items,
    itemsMap: groupBy(items, (item) => compileJSONPointer(item.path)),
    activeItem,
    activeIndex
  }
}

// TODO: unit test
export function searchNext(searchResult: SearchResult): SearchResult {
  const nextActiveIndex =
    searchResult.activeIndex < searchResult.items.length - 1
      ? searchResult.activeIndex + 1
      : searchResult.items.length > 0
      ? 0
      : -1

  const nextActiveItem = searchResult.items[nextActiveIndex]

  const items: ExtendedSearchResultItem[] = searchResult.items.map((item, index) => {
    return { ...item, active: index === nextActiveIndex }
  })

  return {
    ...searchResult,
    items,
    itemsMap: groupBy(items, (item) => compileJSONPointer(item.path)),
    activeItem: nextActiveItem,
    activeIndex: nextActiveIndex
  }
}

// TODO: unit test
export function searchPrevious(searchResult: SearchResult): SearchResult {
  const previousActiveIndex =
    searchResult.activeIndex > 0 ? searchResult.activeIndex - 1 : searchResult.items.length - 1

  const previousActiveItem = searchResult.items[previousActiveIndex]

  const items: ExtendedSearchResultItem[] = searchResult.items.map((item, index) => {
    return { ...item, active: index === previousActiveIndex }
  })

  return {
    ...searchResult,
    items,
    itemsMap: groupBy(items, (item) => compileJSONPointer(item.path)),
    activeItem: previousActiveItem,
    activeIndex: previousActiveIndex
  }
}

// TODO: comment
export function search(
  searchText: string,
  json: JSONValue,
  maxResults = Infinity
): SearchResultItem[] {
  const results: SearchResultItem[] = []
  const path: JSONPath = [] // we reuse the same Array recursively, this is *much* faster than creating a new path every time

  function onMatch(match) {
    if (results.length < maxResults) {
      results.push(match)
    }
  }

  function searchRecursive(searchTextLowerCase: string, value: JSONValue) {
    if (isJSONArray(value)) {
      const level = path.length
      path.push('0')

      for (let i = 0; i < value.length; i++) {
        path[level] = String(i)

        searchRecursive(searchTextLowerCase, value[i])

        if (results.length >= maxResults) {
          return
        }
      }

      path.pop()
    } else if (isJSONObject(value)) {
      const keys = Object.keys(value)
      const level = path.length

      path.push('')

      for (const key of keys) {
        path[level] = key

        findCaseInsensitiveMatches(key, searchTextLowerCase, path, SearchField.key, onMatch)

        searchRecursive(searchTextLowerCase, value[key])

        if (results.length >= maxResults) {
          return
        }
      }

      path.pop()
    } else {
      // type is a value
      findCaseInsensitiveMatches(
        String(value),
        searchTextLowerCase,
        path,
        SearchField.value,
        onMatch
      )
    }
  }

  if (typeof searchText === 'string' && searchText !== '') {
    const searchTextLowerCase = searchText.toLowerCase()
    searchRecursive(searchTextLowerCase, json)
  }

  return results
}

/**
 * Do a case-insensitive search for a search text in a text
 */
export function findCaseInsensitiveMatches(
  text: string,
  searchTextLowerCase: string,
  path: JSONPath,
  field: SearchField,
  onMatch: (searchResultItem: SearchResultItem) => void
): void {
  const textLower = text.toLowerCase()

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
        end: position
      })

      fieldIndex++
    }
  } while (index !== -1)
}

/**
 * Replace a search result item with a replacement text
 */
export function replaceText(text: string, replacementText: string, start: number, end: number) {
  return text.substring(0, start) + replacementText + text.substring(end)
}

/**
 * Replace all matches with a replacement text
 */
export function replaceAllText(
  text: string,
  replacementText: string,
  occurrences: Array<{ start: number; end: number }>
): string {
  let updatedText = text

  forEachRight(occurrences, (occurrence) => {
    updatedText = replaceText(updatedText, replacementText, occurrence.start, occurrence.end)
  })

  return updatedText
}

export function createSearchAndReplaceOperations(
  json: JSONValue,
  documentState: DocumentState,
  replacementText: string,
  searchResultItem: SearchResultItem,
  parser: JSONParser
): { newSelection: JSONSelection; operations: JSONPatchDocument } {
  const { field, path, start, end } = searchResultItem

  if (field === SearchField.key) {
    // replace a key
    const parentPath = initial(path)
    const parent = getIn(json, parentPath)
    const oldKey = last(path)
    const keys = Object.keys(parent)
    const newKey = replaceText(oldKey, replacementText, start, end)

    const operations = rename(parentPath, keys, oldKey, newKey)
    const newSelection = createSelectionFromOperations(json, operations)

    return {
      newSelection,
      operations
    }
  } else if (field === SearchField.value) {
    // replace a value
    const currentValue = getIn(json, path)
    if (currentValue === undefined) {
      throw new Error(`Cannot replace: path not found ${compileJSONPointer(path)}`)
    }
    const currentValueText = typeof currentValue === 'string' ? currentValue : String(currentValue)

    const pointer = compileJSONPointer(path)
    const enforceString = getEnforceString(
      currentValue,
      documentState.enforceStringMap,
      pointer,
      parser
    )

    const value = replaceText(currentValueText, replacementText, start, end)

    const operations: JSONPatchOperation[] = [
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value: enforceString ? value : (stringConvert(value, parser) as JSONValue)
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

export function createSearchAndReplaceAllOperations(
  json: JSONValue,
  documentState: DocumentState,
  searchText: string,
  replacementText: string,
  parser: JSONParser
): { newSelection: JSONSelection; operations: JSONPatchDocument } {
  // TODO: to improve performance, we could reuse existing search results (except when hitting a maxResult limit)
  const searchResultItems = search(searchText, json, Infinity /* maxResults */)

  interface Match {
    path: JSONPath
    field: string
    items: SearchResultItem[]
  }

  // step 1: deduplicate matches inside the same field/value
  // (filter, map, and group)
  const deduplicatedMatches: Match[] = []
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
      if (a.field === SearchField.key) {
        return 1
      } else {
        return -1
      }
    }

    // sort longest paths first, shortest last
    return b.path.length - a.path.length
  })

  // step 3: call createSearchAndReplaceOperations for each of the matches
  let allOperations: JSONPatchDocument = []
  let lastNewSelection = undefined
  deduplicatedMatches.forEach((match) => {
    // TODO: there is overlap with the logic of createSearchAndReplaceOperations. Can we extract and reuse this logic?
    const { field, path, items } = match

    if (field === SearchField.key) {
      // replace a key
      const parentPath = initial(path)
      const parent = getIn(json, parentPath)
      const oldKey = last(path)
      const keys = Object.keys(parent as JSONObject)
      const newKey = replaceAllText(oldKey, replacementText, items)

      const operations = rename(parentPath, keys, oldKey, newKey)
      allOperations = allOperations.concat(operations)

      lastNewSelection = createSelectionFromOperations(json, operations)
    } else if (field === SearchField.value) {
      // replace a value
      const currentValue = getIn(json, path)
      if (currentValue === undefined) {
        throw new Error(`Cannot replace: path not found ${compileJSONPointer(path)}`)
      }
      const currentValueText =
        typeof currentValue === 'string' ? currentValue : String(currentValue)

      const pointer = compileJSONPointer(path)
      const enforceString = getEnforceString(
        currentValue,
        documentState.enforceStringMap,
        pointer,
        parser
      )

      const value = replaceAllText(currentValueText, replacementText, items)

      const operations: JSONPatchOperation[] = [
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: enforceString ? value : (stringConvert(value, parser) as JSONValue)
        }
      ]
      allOperations = allOperations.concat(operations)

      lastNewSelection = createSelectionFromOperations(json, operations)
    } else {
      throw new Error(`Cannot replace: unknown type of search result field ${field}`)
    }
  })

  return {
    operations: allOperations,
    newSelection: lastNewSelection
  }
}

export interface SplitValuePart {
  text: string
  type: 'normal' | 'highlight'
  active: boolean
}

/**
 * Split the text into separate parts for each search result and the text
 * in between.
 */
export function splitValue(text: string, matches: ExtendedSearchResultItem[]): SplitValuePart[] {
  const parts: SplitValuePart[] = []

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
  if (lastMatch && lastMatch.end < text.length) {
    parts.push({
      type: 'normal',
      text: text.slice(lastMatch.end),
      active: false
    })
  }

  return parts
}

/**
 * Get the path of the search result property on a nested search result
 */
function getSearchResultPath(searchResultItem: SearchResultItem): JSONPath {
  return searchResultItem.path.concat(searchResultItem.field, String(searchResultItem.fieldIndex))
}

// TODO: write unit tests
export function filterKeySearchResults(
  map: JSONPointerMap<ExtendedSearchResultItem[]> | undefined,
  pointer: JSONPointer
): ExtendedSearchResultItem[] | undefined {
  const items = map?.[pointer]?.filter((item: SearchResultItem) => item.field === SearchField.key)

  if (!items || items.length === 0) {
    return undefined
  }

  return items
}

// TODO: write unit tests
export function filterValueSearchResults(
  map: JSONPointerMap<ExtendedSearchResultItem[]> | undefined,
  pointer: JSONPointer
): ExtendedSearchResultItem[] | undefined {
  const items = map?.[pointer]?.filter((item: SearchResultItem) => item.field === SearchField.value)

  if (!items || items.length === 0) {
    return undefined
  }

  return items
}
