import { describe, test } from 'vitest'
import assert from 'assert'
import type { JSONPath } from 'immutable-json-patch'
import { immutableJSONPatch } from 'immutable-json-patch'
import { createDocumentState } from './documentState.js'
import {
  createSearchAndReplaceAllOperations,
  createSearchAndReplaceOperations,
  filterKeySearchResults,
  filterValueSearchResults,
  findCaseInsensitiveMatches,
  flattenSearchResults,
  replaceText,
  search,
  splitValue,
  toRecursiveSearchResults
} from './search.js'
import type {
  ExtendedSearchResultItem,
  SearchResults,
  SearchOptions,
  SearchResultItem,
  ObjectSearchResults,
  ArraySearchResults
} from '$lib/types.js'
import { SearchField } from '$lib/types.js'
import { createKeySelection, createValueSelection } from './selection.js'

describe('search', () => {
  test('search in JSON', () => {
    const json = {
      b: { c: 'a' },
      a: [{ a: 'b', c: 'a' }, 'e', 'a']
    }

    const results = search('a', json)

    assert.deepStrictEqual(results, [
      {
        path: ['b', 'c'],
        field: SearchField.value,
        fieldIndex: 0,
        start: 0,
        end: 1
      },
      {
        path: ['a'],
        field: SearchField.key,
        fieldIndex: 0,
        start: 0,
        end: 1
      },
      {
        path: ['a', '0', 'a'],
        field: SearchField.key,
        fieldIndex: 0,
        start: 0,
        end: 1
      },
      {
        path: ['a', '0', 'c'],
        field: SearchField.value,
        fieldIndex: 0,
        start: 0,
        end: 1
      },
      {
        path: ['a', '2'],
        field: SearchField.value,
        fieldIndex: 0,
        start: 0,
        end: 1
      }
    ])
  })

  test('search should find multiple occurrences in JSON, case insensitive', () => {
    const json = {
      'hello world': 'hello world, hello WORLD, world'
    }

    const results = search('world', json)

    assert.deepStrictEqual(results, [
      {
        path: ['hello world'],
        field: SearchField.key,
        fieldIndex: 0,
        start: 6,
        end: 11
      },
      {
        path: ['hello world'],
        field: SearchField.value,
        fieldIndex: 0,
        start: 6,
        end: 11
      },
      {
        path: ['hello world'],
        field: SearchField.value,
        fieldIndex: 1,
        start: 19,
        end: 24
      },
      {
        path: ['hello world'],
        field: SearchField.value,
        fieldIndex: 2,
        start: 26,
        end: 31
      }
    ])
  })

  test('should respect order of keys in document state in search', () => {
    const json = {
      data: {
        text2: 'foo',
        text1: 'foo'
      }
    }

    const results = search('foo', json)
    assert.deepStrictEqual(results, [
      {
        path: ['data', 'text2'],
        field: SearchField.value,
        fieldIndex: 0,
        start: 0,
        end: 3
      },
      {
        path: ['data', 'text1'],
        field: SearchField.value,
        fieldIndex: 0,
        start: 0,
        end: 3
      }
    ])
  })

  test('should limit search results to the provided max', () => {
    const count = 10
    const json = Array(count).fill(42)

    const resultsAll = search('42', json)
    assert.deepStrictEqual(resultsAll.length, count)

    const maxResults = 4
    const results = search('42', json, { maxResults })
    assert.deepStrictEqual(results.length, maxResults)
  })

  describe('search using columns', () => {
    const json = [
      { id: 1, name: 'John', address: { city: 'Rotterdam' } },
      { id: 2, name: 'Sarah', address: { city: 'Amsterdam' } }
    ]

    const json2 = ['John', 'Sarah']

    function searchPaths(searchText: string, json: unknown, options?: SearchOptions): JSONPath[] {
      return search(searchText, json, options).map((result) => result.path)
    }

    test('should search in column names when not using columns', () => {
      assert.deepStrictEqual(searchPaths('name', json), [
        ['0', 'name'],
        ['1', 'name']
      ])
      assert.deepStrictEqual(searchPaths('address', json), [
        ['0', 'address'],
        ['1', 'address']
      ])
      assert.deepStrictEqual(searchPaths('city', json), [
        ['0', 'address', 'city'],
        ['1', 'address', 'city']
      ])
      assert.deepStrictEqual(searchPaths('john', json), [['0', 'name']])
      assert.deepStrictEqual(searchPaths('rotterdam', json), [['0', 'address', 'city']])
    })

    test('should not search in column names when using nested columns', () => {
      const columns = [['id'], ['name'], ['address']]
      assert.deepStrictEqual(searchPaths('name', json, { columns }), [])
      assert.deepStrictEqual(searchPaths('address', json, { columns }), [])
      assert.deepStrictEqual(searchPaths('city', json, { columns }), [
        ['0', 'address', 'city'],
        ['1', 'address', 'city']
      ])
      assert.deepStrictEqual(searchPaths('john', json, { columns }), [['0', 'name']])
      assert.deepStrictEqual(searchPaths('rotterdam', json, { columns }), [
        ['0', 'address', 'city']
      ])
    })

    test('should not search in column names when using flattened columns', () => {
      const columns = [['id'], ['name'], ['address', 'city']]
      assert.deepStrictEqual(searchPaths('name', json, { columns }), [])
      assert.deepStrictEqual(searchPaths('address', json, { columns }), [])
      assert.deepStrictEqual(searchPaths('city', json, { columns }), [])
      assert.deepStrictEqual(searchPaths('john', json, { columns }), [['0', 'name']])
      assert.deepStrictEqual(searchPaths('rotterdam', json, { columns }), [
        ['0', 'address', 'city']
      ])
    })

    test('should search in a flat array without columns', () => {
      assert.deepStrictEqual(searchPaths('foo', json2), [])
      assert.deepStrictEqual(searchPaths('john', json2), [['0']])
    })

    test('should search in a flat array with columns', () => {
      const columns = [[]]
      assert.deepStrictEqual(searchPaths('foo', json2, { columns }), [])
      assert.deepStrictEqual(searchPaths('john', json2, { columns }), [['0']])
    })
  })

  test('should limit search results to the provided max in case of multiple matches in a single field', () => {
    const maxResults = 4

    assert.deepStrictEqual(
      search('ha', { greeting: 'ha ha ha ha ha ha' }, { maxResults }).length,
      maxResults
    )

    assert.deepStrictEqual(
      search('ha', { 'ha ha ha ha ha ha': 'ha ha ha ha ha ha' }, { maxResults }).length,
      maxResults
    )
  })

  test('should find all case insensitive matches', () => {
    const path: JSONPath = []
    const field = SearchField.value

    assert.deepStrictEqual(
      findAndCollectCaseInsensitiveMatches('hello world, Hello world', 'hello', path, field),
      [
        { path, field, fieldIndex: 0, start: 0, end: 5 },
        { path, field, fieldIndex: 1, start: 13, end: 18 }
      ]
    )

    assert.deepStrictEqual(findAndCollectCaseInsensitiveMatches('hahaha', 'haha', path, field), [
      { path, field, fieldIndex: 0, start: 0, end: 4 }
    ])
    assert.deepStrictEqual(
      findAndCollectCaseInsensitiveMatches('hahahahaha', 'haha', path, field),
      [
        { path, field, fieldIndex: 0, start: 0, end: 4 },
        { path, field, fieldIndex: 1, start: 4, end: 8 }
      ]
    )

    assert.deepStrictEqual(
      findAndCollectCaseInsensitiveMatches('hello world, Hello world', 'greeting', path, field),
      []
    )
  })

  test('should split search results', () => {
    const text = 'hello world, HELLO!'
    const searchTextLowerCase = 'hello'
    const path: JSONPath = []
    const field = SearchField.value
    const searchResults = findAndCollectCaseInsensitiveMatches(
      text,
      searchTextLowerCase,
      path,
      field
    )
    const extendedSearchResults: ExtendedSearchResultItem[] = searchResults.map((item, index) => {
      return {
        ...item,
        active: index === 1
      }
    })

    const parts = splitValue(text, extendedSearchResults)

    assert.deepStrictEqual(parts, [
      {
        type: 'highlight',
        text: 'hello',
        active: false
      },
      {
        type: 'normal',
        text: ' world, ',
        active: false
      },
      {
        type: 'highlight',
        text: 'HELLO',
        active: true
      },
      {
        type: 'normal',
        text: '!',
        active: false
      }
    ])
  })

  test('should replace text', () => {
    assert.strictEqual(replaceText('hello, world!', '***', 7, 12), 'hello, ***!')
  })

  test('should create operations to replace a search result value', () => {
    const json = {
      before: 'text',
      'hello world': 'hello world, hello WORLD, world',
      after: 'text'
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const results = search('world', json)

    const { operations, newSelection } = createSearchAndReplaceOperations(
      json,
      documentState,
      '*',
      results[2],
      JSON
    )

    assert.deepStrictEqual(operations, [
      {
        op: 'replace',
        path: '/hello world',
        value: 'hello world, hello *, world'
      }
    ])

    assert.deepStrictEqual(newSelection, createValueSelection(['hello world']))

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      before: 'text',
      'hello world': 'hello world, hello *, world',
      after: 'text'
    })
  })

  test('should create operations to replace a search result key', () => {
    const json = {
      before: 'text',
      'hello world': 'hello world, hello WORLD, world',
      after: 'text'
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const results = search('world', json)

    const { operations, newSelection } = createSearchAndReplaceOperations(
      json,
      documentState,
      '*',
      results[0],
      JSON
    )

    assert.deepStrictEqual(operations, [
      { op: 'move', from: '/hello world', path: '/hello *' },
      { op: 'move', from: '/after', path: '/after' }
    ])

    assert.deepStrictEqual(newSelection, createKeySelection(['hello *']))

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      before: 'text',
      'hello *': 'hello world, hello WORLD, world',
      after: 'text'
    })
  })

  test('should create operations to replace with a numeric value', () => {
    const json = {
      value: 2
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const results = search('2', json)

    const { operations } = createSearchAndReplaceOperations(
      json,
      documentState,
      '4',
      results[0],
      JSON
    )

    assert.deepStrictEqual(operations, [
      {
        op: 'replace',
        path: '/value',
        value: 4
      }
    ])

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      value: 4
    })
  })

  test('should create operations to replace with a boolean value', () => {
    const json = {
      value: 2
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const results = search('2', json)

    const { operations } = createSearchAndReplaceOperations(
      json,
      documentState,
      'true',
      results[0],
      JSON
    )

    assert.deepStrictEqual(operations, [
      {
        op: 'replace',
        path: '/value',
        value: true
      }
    ])

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      value: true
    })
  })

  test('should create operations to replace with a null value', () => {
    const json = {
      value: 2
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const results = search('2', json)

    const { operations } = createSearchAndReplaceOperations(
      json,
      documentState,
      'null',
      results[0],
      JSON
    )

    assert.deepStrictEqual(operations, [
      {
        op: 'replace',
        path: '/value',
        value: null
      }
    ])

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      value: null
    })
  })

  test('should create operations to replace a numeric value with a string', () => {
    const json = {
      value: 2
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const results = search('2', json)

    const { operations } = createSearchAndReplaceOperations(
      json,
      documentState,
      '*',
      results[0],
      JSON
    )

    assert.deepStrictEqual(operations, [{ op: 'replace', path: '/value', value: '*' }])

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      value: '*'
    })
  })

  // test('should search inside a JSON object with LosslessNumbers', () => {
  //
  // })

  test('should create operations to replace all search results', () => {
    const json = {
      before: 'text',
      'hello world': {
        'nested world': 'hello world, hello WORLD, world'
      },
      after: 'text'
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const searchText = 'world'
    const replacementText = '*'
    const { operations, newSelection } = createSearchAndReplaceAllOperations(
      json,
      documentState,
      searchText,
      replacementText,
      JSON
    )

    assert.deepStrictEqual(operations, [
      {
        op: 'replace',
        path: '/hello world/nested world',
        value: 'hello *, hello *, *'
      },
      {
        op: 'move',
        from: '/hello world/nested world',
        path: '/hello world/nested *'
      },
      { op: 'move', from: '/hello world', path: '/hello *' },
      { op: 'move', from: '/after', path: '/after' }
    ])

    assert.deepStrictEqual(newSelection, createKeySelection(['hello *']))

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      before: 'text',
      'hello *': {
        'nested *': 'hello *, hello *, *'
      },
      after: 'text'
    })
  })

  test('should create operations to replace all search results matching a numeric value', () => {
    const json = {
      value: 2
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const searchText = '2'
    const replacementText = '*'
    const { operations } = createSearchAndReplaceAllOperations(
      json,
      documentState,
      searchText,
      replacementText,
      JSON
    )

    assert.deepStrictEqual(operations, [
      {
        op: 'replace',
        path: '/value',
        value: '*'
      }
    ])

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      value: '*'
    })
  })

  test('should create operations to replace all search results with a numeric value', () => {
    const json = {
      value: 2
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const searchText = '2'
    const replacementText = '4'
    const { operations } = createSearchAndReplaceAllOperations(
      json,
      documentState,
      searchText,
      replacementText,
      JSON
    )

    assert.deepStrictEqual(operations, [
      {
        op: 'replace',
        path: '/value',
        value: 4
      }
    ])

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      value: 4
    })
  })

  describe('filterKeySearchResults', () => {
    test('should filter key search results when not empty', () => {
      const result1: ExtendedSearchResultItem = {
        path: ['a'],
        field: SearchField.value,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      }
      const result2: ExtendedSearchResultItem = {
        path: ['a'],
        field: SearchField.key,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: true
      }
      const results: ObjectSearchResults = {
        type: 'object',
        properties: {},
        searchResults: [result1, result2]
      }

      assert.deepStrictEqual(filterKeySearchResults(results), [result2])
    })

    test('should filter key search results when empty (1)', () => {
      const result1: ExtendedSearchResultItem = {
        path: ['a'],
        field: SearchField.value,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      }
      const results: ObjectSearchResults = {
        type: 'object',
        properties: {},
        searchResults: [result1]
      }

      assert.deepStrictEqual(filterKeySearchResults(results), undefined)
    })

    test('should filter key search results when empty (2)', () => {
      const results: ObjectSearchResults = {
        type: 'object',
        properties: {},
        searchResults: []
      }

      assert.deepStrictEqual(filterKeySearchResults(results), undefined)
    })

    test('should filter key search results when undefined', () => {
      const results: ObjectSearchResults = {
        type: 'object',
        properties: {},
        searchResults: undefined
      }

      assert.deepStrictEqual(filterKeySearchResults(results), undefined)
    })
  })

  describe('filterValueSearchResults', () => {
    test('should filter value search results when not empty', () => {
      const result1: ExtendedSearchResultItem = {
        path: ['a'],
        field: SearchField.value,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      }
      const result2: ExtendedSearchResultItem = {
        path: ['a'],
        field: SearchField.key,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: true
      }
      const results: ObjectSearchResults = {
        type: 'object',
        properties: {},
        searchResults: [result1, result2]
      }

      assert.deepStrictEqual(filterValueSearchResults(results), [result1])
    })

    test('should filter value search results when empty (1)', () => {
      const result1: ExtendedSearchResultItem = {
        path: ['a'],
        field: SearchField.key,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      }
      const results: ObjectSearchResults = {
        type: 'object',
        properties: {},
        searchResults: [result1]
      }

      assert.deepStrictEqual(filterValueSearchResults(results), undefined)
    })

    test('should filter value search results when empty (2)', () => {
      const results: ObjectSearchResults = {
        type: 'object',
        properties: {},
        searchResults: []
      }

      assert.deepStrictEqual(filterValueSearchResults(results), undefined)
    })

    test('should filter value search results when undefined', () => {
      const results: ObjectSearchResults = {
        type: 'object',
        properties: {},
        searchResults: undefined
      }

      assert.deepStrictEqual(filterValueSearchResults(results), undefined)
    })
  })

  describe('toRecursiveSearchResult', () => {
    const json = {
      b: { c: 'a' },
      a: [{ a: 'b', c: 'a' }, 'e', 'a']
    }

    const expectedSearchResults: ExtendedSearchResultItem[] = [
      {
        path: ['b', 'c'],
        field: SearchField.value,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      },
      {
        path: ['a'],
        field: SearchField.key,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: true
      },
      {
        path: ['a', '0', 'a'],
        field: SearchField.key,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      },
      {
        path: ['a', '0', 'c'],
        field: SearchField.value,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      },
      {
        path: ['a', '2'],
        field: SearchField.value,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      }
    ]

    const items: ArraySearchResults['items'] = []
    items[0] = {
      type: 'object',
      properties: {
        a: { type: 'value', searchResults: [expectedSearchResults[2]] },
        c: { type: 'value', searchResults: [expectedSearchResults[3]] }
      }
    }
    items[2] = { type: 'value', searchResults: [expectedSearchResults[4]] }
    const expectedRecursiveSearchResult: SearchResults = {
      type: 'object',
      properties: {
        b: {
          type: 'object',
          properties: {
            c: { type: 'value', searchResults: [expectedSearchResults[0]] }
          }
        },
        a: {
          type: 'array',
          searchResults: [expectedSearchResults[1]],
          items
        }
      }
    }

    test('should create recursive search result', () => {
      const activeIndex = 1
      const results = search('a', json).map((item, index) => ({
        ...item,
        active: index === activeIndex
      }))

      assert.deepStrictEqual(results, expectedSearchResults)

      const recursiveResults = toRecursiveSearchResults(json, results)

      assert.deepStrictEqual(recursiveResults, expectedRecursiveSearchResult)
    })

    test('should flatten recursive search result', () => {
      const flatResults = flattenSearchResults(expectedRecursiveSearchResult)

      assert.deepStrictEqual(flatResults, expectedSearchResults)
    })

    test('should merge recursive search results in a single object', () => {
      const json = {
        a: 'aha'
      }

      const activeIndex = 1
      const results = search('a', json).map((item, index) => ({
        ...item,
        active: index === activeIndex
      }))

      const expected = [
        {
          path: ['a'],
          field: SearchField.key,
          fieldIndex: 0,
          start: 0,
          end: 1,
          active: false
        },
        {
          path: ['a'],
          field: SearchField.value,
          fieldIndex: 0,
          start: 0,
          end: 1,
          active: true
        },
        {
          path: ['a'],
          field: SearchField.value,
          fieldIndex: 1,
          start: 2,
          end: 3,
          active: false
        }
      ]

      assert.deepStrictEqual(results, expected)

      const recursiveResults = toRecursiveSearchResults(json, results)
      assert.deepStrictEqual(recursiveResults, {
        type: 'object',
        properties: {
          a: {
            type: 'value',
            searchResults: [expected[0], expected[1], expected[2]]
          }
        }
      })
    })
  })
})

// helper function to collect matches
function findAndCollectCaseInsensitiveMatches(
  text: string,
  searchTextLowerCase: string,
  path: JSONPath,
  field: SearchField
): SearchResultItem[] {
  const matches: SearchResultItem[] = []

  findCaseInsensitiveMatches(text, searchTextLowerCase, path, field, (match) => matches.push(match))

  return matches
}
