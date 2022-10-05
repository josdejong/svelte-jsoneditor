import assert from 'assert'
import type { JSONPath } from 'immutable-json-patch'
import { immutableJSONPatch } from 'immutable-json-patch'
import { createDocumentState } from './documentState.js'
import {
  createSearchAndReplaceAllOperations,
  createSearchAndReplaceOperations,
  findCaseInsensitiveMatches,
  replaceText,
  search,
  splitValue
} from './search.js'
import type { ExtendedSearchResultItem, SearchResultItem } from '../types.js'
import { SearchField } from '../types.js'
import { createKeySelection, createValueSelection } from './selection.js'

describe('search', () => {
  it('search in JSON', () => {
    const json = {
      b: { c: 'a' },
      a: [{ a: 'b', c: 'a' }, 'e', 'a']
    }

    const documentState = createDocumentState()
    const results = search('a', json, documentState)

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

  it('search should find multiple occurrences in JSON, case insensitive', () => {
    const json = {
      'hello world': 'hello world, hello WORLD, world'
    }

    const documentState = createDocumentState()
    const results = search('world', json, documentState)

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

  it('should respect order of keys in document state in search', () => {
    const json = {
      data: {
        text2: 'foo',
        text1: 'foo'
      }
    }

    const documentState = {
      ...createDocumentState({ json, expand: () => true })
    }

    const results = search('foo', json, documentState)
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

  it('should limit search results to the provided max', () => {
    const count = 10
    const json = Array(count).fill(42)

    const resultsAll = search('42', json, undefined)
    assert.deepStrictEqual(resultsAll.length, count)

    const maxResults = 4
    const results = search('42', json, undefined, maxResults)
    assert.deepStrictEqual(results.length, maxResults)
  })

  it('should limit search results to the provided max in case of multiple matches in a single field', () => {
    const maxResults = 4

    assert.deepStrictEqual(
      search('ha', { greeting: 'ha ha ha ha ha ha' }, createDocumentState(), maxResults).length,
      maxResults
    )

    assert.deepStrictEqual(
      search('ha', { 'ha ha ha ha ha ha': 'ha ha ha ha ha ha' }, createDocumentState(), maxResults)
        .length,
      maxResults
    )
  })

  it('should find all case insensitive matches', () => {
    const path = []
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

  it('should split search results', () => {
    const text = 'hello world, HELLO!'
    const searchTextLowerCase = 'hello'
    const path = []
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

  it('should replace text', () => {
    assert.strictEqual(replaceText('hello, world!', '***', 7, 12), 'hello, ***!')
  })

  it('should create operations to replace a search result value', () => {
    const json = {
      before: 'text',
      'hello world': 'hello world, hello WORLD, world',
      after: 'text'
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const results = search('world', json, documentState)

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

    assert.deepStrictEqual(newSelection, createValueSelection(['hello world'], false))

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      before: 'text',
      'hello world': 'hello world, hello *, world',
      after: 'text'
    })
  })

  it('should create operations to replace a search result key', () => {
    const json = {
      before: 'text',
      'hello world': 'hello world, hello WORLD, world',
      after: 'text'
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const results = search('world', json, documentState)

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

    assert.deepStrictEqual(newSelection, createKeySelection(['hello *'], false))

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      before: 'text',
      'hello *': 'hello world, hello WORLD, world',
      after: 'text'
    })
  })

  it('should create operations to replace with a numeric value', () => {
    const json = {
      value: 2
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const results = search('2', json, documentState)

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

  it('should create operations to replace with a boolean value', () => {
    const json = {
      value: 2
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const results = search('2', json, documentState)

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

  it('should create operations to replace with a null value', () => {
    const json = {
      value: 2
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const results = search('2', json, documentState)

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

  it('should create operations to replace a numeric value with a string', () => {
    const json = {
      value: 2
    }
    const documentState = createDocumentState({ json, expand: () => true })

    const results = search('2', json, documentState)

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

  // it('should search inside a JSON object with LosslessNumbers', () => {
  //
  // })

  it('should create operations to replace all search results', () => {
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

    assert.deepStrictEqual(newSelection, createKeySelection(['hello *'], false))

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      before: 'text',
      'hello *': {
        'nested *': 'hello *, hello *, *'
      },
      after: 'text'
    })
  })

  it('should create operations to replace all search results matching a numeric value', () => {
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

  it('should create operations to replace all search results with a numeric value', () => {
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
