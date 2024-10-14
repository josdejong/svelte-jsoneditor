import type { JSONPatchDocument, JSONPatchOperation, JSONPath } from 'immutable-json-patch'
import { compileJSONPointer, getIn, isJSONArray, isJSONObject } from 'immutable-json-patch'
import { forEachRight, initial, isEqual, last } from 'lodash-es'
import { getEnforceString, updateInRecursiveState } from './documentState.js'
import { createSelectionFromOperations } from './selection.js'
import { rename } from './operations.js'
import { stringConvert } from '../utils/typeUtils.js'
import type {
  DocumentState,
  ExtendedSearchResultItem,
  JSONParser,
  JSONSelection,
  SearchOptions,
  SearchResultDetails,
  SearchResultItem,
  SearchResults,
  RecursiveStateFactory
} from '$lib/types'
import { SearchField } from '$lib/types.js'
import {
  hasSearchResults,
  isArrayRecursiveState,
  isObjectRecursiveState
} from 'svelte-jsoneditor/typeguards.js'

// TODO: comment
// TODO: unit test
export function updateSearchResult(
  newResultItems: SearchResultItem[],
  previousResult: SearchResultDetails | undefined
): SearchResultDetails {
  const activePath = previousResult?.activeItem
    ? getSearchResultPath(previousResult.activeItem)
    : undefined

  const matchingActiveIndex = newResultItems.findIndex((item) => {
    return isEqual(activePath, getSearchResultPath(item))
  })

  const activeIndex =
    matchingActiveIndex !== -1
      ? matchingActiveIndex
      : previousResult?.activeIndex !== undefined &&
          previousResult?.activeIndex < newResultItems.length
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
    activeItem,
    activeIndex
  }
}

// TODO: unit test
export function searchNext(searchResult: SearchResultDetails): SearchResultDetails {
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
    activeItem: nextActiveItem,
    activeIndex: nextActiveIndex
  }
}

// TODO: unit test
export function searchPrevious(searchResult: SearchResultDetails): SearchResultDetails {
  const previousActiveIndex =
    searchResult.activeIndex > 0 ? searchResult.activeIndex - 1 : searchResult.items.length - 1

  const previousActiveItem = searchResult.items[previousActiveIndex]

  const items: ExtendedSearchResultItem[] = searchResult.items.map((item, index) => {
    return { ...item, active: index === previousActiveIndex }
  })

  return {
    ...searchResult,
    items,
    activeItem: previousActiveItem,
    activeIndex: previousActiveIndex
  }
}

// TODO: comment
export function search(
  searchText: string,
  json: unknown,
  options: SearchOptions = {}
): SearchResultItem[] {
  const searchTextLowerCase = searchText.toLowerCase()
  const maxResults = options?.maxResults ?? Infinity
  const columns = options?.columns
  const results: SearchResultItem[] = []
  const path: JSONPath = [] // we reuse the same Array recursively, this is *much* faster than creating a new path every time

  function onMatch(match: SearchResultItem) {
    if (results.length >= maxResults) {
      return
    }

    results.push(match)
  }

  function searchRecursive(searchTextLowerCase: string, value: unknown) {
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

  if (searchText === '') {
    return []
  } else if (columns) {
    if (!Array.isArray(json)) {
      throw new Error('json must be an Array when option columns is defined')
    }

    for (let i = 0; i < json.length; i++) {
      path[0] = String(i)

      const item = json[i]

      for (let c = 0; c < columns.length; c++) {
        const column = columns[c]

        if (column.length === 1) {
          path[1] = column[0]
        } else {
          for (let p = 0; p < column.length; p++) {
            path[p + 1] = column[p]
          }
        }
        while (path.length > column.length + 1) {
          path.pop()
        }

        const value = getIn(item, column)

        searchRecursive(searchTextLowerCase, value)
      }

      if (results.length >= maxResults) {
        break
      }
    }

    return results
  } else {
    searchRecursive(searchTextLowerCase, json)
    return results
  }
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
  json: unknown,
  documentState: DocumentState | undefined,
  replacementText: string,
  searchResultItem: SearchResultItem,
  parser: JSONParser
): { newSelection: JSONSelection | undefined; operations: JSONPatchDocument } {
  const { field, path, start, end } = searchResultItem

  if (field === SearchField.key) {
    // replace a key
    const parentPath = initial(path)
    const parent = getIn(json, parentPath)
    const oldKey = last(path) as string
    const keys = Object.keys(parent as Record<string, unknown>)
    const newKey = replaceText(oldKey, replacementText, start, end)

    const operations = rename(parentPath, keys, oldKey, newKey)
    const newSelection = createSelectionFromOperations(json, operations)

    return {
      newSelection,
      operations
    }
  } else if (field === SearchField.value) {
    // replace a value
    const currentValue: unknown | undefined = getIn(json, path)
    if (currentValue === undefined) {
      throw new Error(`Cannot replace: path not found ${compileJSONPointer(path)}`)
    }
    const currentValueText = typeof currentValue === 'string' ? currentValue : String(currentValue)

    const enforceString = getEnforceString(json, documentState, path)
    const value = replaceText(currentValueText, replacementText, start, end)

    const operations: JSONPatchOperation[] = [
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value: enforceString ? value : stringConvert(value, parser)
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
  json: unknown,
  documentState: DocumentState | undefined,
  searchText: string,
  replacementText: string,
  parser: JSONParser
): { newSelection: JSONSelection | undefined; operations: JSONPatchDocument } {
  // TODO: to improve performance, we could reuse existing search results (except when hitting a maxResult limit)
  const searchResultItems = search(searchText, json, { maxResults: Infinity })

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
      ;(last(deduplicatedMatches) as Match).items.push(item)
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
  let lastNewSelection: JSONSelection | undefined
  deduplicatedMatches.forEach((match) => {
    // TODO: there is overlap with the logic of createSearchAndReplaceOperations. Can we extract and reuse this logic?
    const { field, path, items } = match

    if (field === SearchField.key) {
      // replace a key
      const parentPath = initial(path)
      const parent = getIn(json, parentPath)
      const oldKey = last(path) as string
      const keys = Object.keys(parent as Record<string, unknown>)
      const newKey = replaceAllText(oldKey, replacementText, items)

      const operations = rename(parentPath, keys, oldKey, newKey)
      allOperations = allOperations.concat(operations)

      lastNewSelection = createSelectionFromOperations(json, operations)
    } else if (field === SearchField.value) {
      // replace a value
      const currentValue: unknown | undefined = getIn(json, path)
      if (currentValue === undefined) {
        throw new Error(`Cannot replace: path not found ${compileJSONPointer(path)}`)
      }
      const currentValueText =
        typeof currentValue === 'string' ? currentValue : String(currentValue)
      const enforceString = getEnforceString(json, documentState, path)
      const value = replaceAllText(currentValueText, replacementText, items)

      const operations: JSONPatchOperation[] = [
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: enforceString ? value : stringConvert(value, parser)
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

/**
 * Filter key search results.
 * Returns a non-empty array, or undefined if there are no key search results
 */
export function filterKeySearchResults(
  searchResult: SearchResults | undefined
): ExtendedSearchResultItem[] | undefined {
  const filtered = hasSearchResults(searchResult)
    ? searchResult.searchResults.filter((result) => result.field === SearchField.key)
    : undefined

  return filtered && filtered.length > 0 ? filtered : undefined
}

/**
 * Filter value search results.
 * Returns a non-empty array, or undefined if there are no value search results
 */
export function filterValueSearchResults(
  searchResult: SearchResults | undefined
): ExtendedSearchResultItem[] | undefined {
  const filtered = hasSearchResults(searchResult)
    ? searchResult.searchResults.filter((result) => result.field === SearchField.value)
    : undefined

  return filtered && filtered.length > 0 ? filtered : undefined
}

export const searchResultsFactory: RecursiveStateFactory = {
  createObjectDocumentState: () => ({ type: 'object', properties: {} }),
  createArrayDocumentState: () => ({ type: 'array', items: [] }),
  createValueDocumentState: () => ({ type: 'value' })
}

export function updateInSearchResults(
  json: unknown,
  searchResults: SearchResults | undefined,
  path: JSONPath,
  transform: (value: unknown, state: SearchResults) => SearchResults
): SearchResults {
  return updateInRecursiveState(json, searchResults, path, transform, searchResultsFactory)
}

export function toRecursiveSearchResults(
  json: unknown,
  searchResultItems: ExtendedSearchResultItem[]
): SearchResults | undefined {
  return searchResultItems.reduce(
    (recursiveState, searchResult) => {
      return updateInSearchResults(json, recursiveState, searchResult.path, (_, nestedState) => ({
        ...nestedState,
        searchResults: nestedState.searchResults
          ? nestedState.searchResults.concat(searchResult)
          : [searchResult]
      }))
    },
    undefined as SearchResults | undefined
  )
}

export function flattenSearchResults(node: SearchResults | undefined): ExtendedSearchResultItem[] {
  const self = node?.searchResults ?? []

  const nested = isObjectRecursiveState(node)
    ? Object.values(node.properties).flatMap(flattenSearchResults)
    : isArrayRecursiveState(node)
      ? node.items.flatMap(flattenSearchResults)
      : []

  return self.concat(nested)
}
