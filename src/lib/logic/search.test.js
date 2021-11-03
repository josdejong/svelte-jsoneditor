import assert from 'assert'
import { immutableJSONPatch } from 'immutable-json-patch'
import { STATE_KEYS, STATE_SEARCH_PROPERTY, STATE_SEARCH_VALUE } from '../constants.js'
import { syncState } from './documentState.js'
import {
  createRecursiveSearchResults,
  createSearchAndReplaceAllOperations,
  createSearchAndReplaceOperations,
  findCaseInsensitiveMatches,
  replaceText,
  search,
  splitValue
} from './search.js'

describe('search', () => {
  it('search in JSON', () => {
    const json = {
      b: { c: 'a' },
      a: [{ a: 'b', c: 'a' }, 'e', 'a']
    }

    const results = search('a', json, undefined)

    assert.deepStrictEqual(results, [
      {
        path: ['b', 'c'],
        field: STATE_SEARCH_VALUE,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      },
      {
        path: ['a'],
        field: STATE_SEARCH_PROPERTY,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      },
      {
        path: ['a', 0, 'a'],
        field: STATE_SEARCH_PROPERTY,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      },
      {
        path: ['a', 0, 'c'],
        field: STATE_SEARCH_VALUE,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      },
      {
        path: ['a', 2],
        field: STATE_SEARCH_VALUE,
        fieldIndex: 0,
        start: 0,
        end: 1,
        active: false
      }
    ])
  })

  it('search should find multiple occurrences in JSON, case insensitive', () => {
    const json = {
      'hello world': 'hello world, hello WORLD, world'
    }

    const results = search('world', json, undefined)

    assert.deepStrictEqual(results, [
      {
        path: ['hello world'],
        field: STATE_SEARCH_PROPERTY,
        fieldIndex: 0,
        start: 6,
        end: 11,
        active: false
      },
      {
        path: ['hello world'],
        field: STATE_SEARCH_VALUE,
        fieldIndex: 0,
        start: 6,
        end: 11,
        active: false
      },
      {
        path: ['hello world'],
        field: STATE_SEARCH_VALUE,
        fieldIndex: 1,
        start: 19,
        end: 24,
        active: false
      },
      {
        path: ['hello world'],
        field: STATE_SEARCH_VALUE,
        fieldIndex: 2,
        start: 26,
        end: 31,
        active: false
      }
    ])
  })

  it('should respect order of keys in document state in search', () => {
    const json = {
      data: {
        text1: 'foo',
        text2: 'foo'
      }
    }

    const state = syncState(json, undefined, [], () => true)
    state.data[STATE_KEYS] = ['text2', 'text1'] // reverse the order of the keys

    const results = search('foo', json, state)
    assert.deepStrictEqual(results, [
      {
        path: ['data', 'text2'],
        field: STATE_SEARCH_VALUE,
        fieldIndex: 0,
        start: 0,
        end: 3,
        active: false
      },
      {
        path: ['data', 'text1'],
        field: STATE_SEARCH_VALUE,
        fieldIndex: 0,
        start: 0,
        end: 3,
        active: false
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
      search('ha', { greeting: 'ha ha ha ha ha ha' }, undefined, maxResults).length,
      maxResults
    )

    assert.deepStrictEqual(
      search('ha', { 'ha ha ha ha ha ha': 'ha ha ha ha ha ha' }, undefined, maxResults).length,
      maxResults
    )
  })

  it('should generate recursive search results from flat results', () => {
    // Based on document:
    const json = {
      b: { c: 'a' },
      a: [{ a: 'b', c: 'a' }, 'e', 'a a']
    }

    // search results for 'a':
    const flatResults = search('a', json, undefined)

    const actual = createRecursiveSearchResults(json, flatResults)
    const expected = {}

    expected.b = {}
    expected.b.c = {}
    expected.b.c[STATE_SEARCH_VALUE] = [flatResults[0]]
    expected.a = []
    expected.a[STATE_SEARCH_PROPERTY] = [flatResults[1]]
    expected.a[0] = {}
    expected.a[0].a = {}
    expected.a[0].a[STATE_SEARCH_PROPERTY] = [flatResults[2]]
    expected.a[0].c = {}
    expected.a[0].c[STATE_SEARCH_VALUE] = [flatResults[3]]
    expected.a[2] = {}
    expected.a[2][STATE_SEARCH_VALUE] = [flatResults[4], flatResults[5]]

    assert.deepStrictEqual(actual, expected)
  })

  it('should find all case insensitive matches', () => {
    const path = []
    const field = STATE_SEARCH_VALUE

    assert.deepStrictEqual(
      findAndCollectCaseInsensitiveMatches('hello world, Hello world', 'hello', path, field),
      [
        { path, field, fieldIndex: 0, start: 0, end: 5, active: false },
        { path, field, fieldIndex: 1, start: 13, end: 18, active: false }
      ]
    )

    assert.deepStrictEqual(findAndCollectCaseInsensitiveMatches('hahaha', 'haha', path, field), [
      { path, field, fieldIndex: 0, start: 0, end: 4, active: false }
    ])
    assert.deepStrictEqual(
      findAndCollectCaseInsensitiveMatches('hahahahaha', 'haha', path, field),
      [
        { path, field, fieldIndex: 0, start: 0, end: 4, active: false },
        { path, field, fieldIndex: 1, start: 4, end: 8, active: false }
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
    const field = STATE_SEARCH_VALUE
    const searchResults = findAndCollectCaseInsensitiveMatches(
      text,
      searchTextLowerCase,
      path,
      field
    )

    const parts = splitValue(text, searchResults)

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
        active: false
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
    const state = syncState(json, undefined, [], () => true)

    const results = search('world', json, state)

    const { operations, newSelection } = createSearchAndReplaceOperations(
      json,
      state,
      '*',
      results[2]
    )

    assert.deepStrictEqual(operations, [
      {
        op: 'replace',
        path: '/hello world',
        value: 'hello world, hello *, world'
      }
    ])

    assert.deepStrictEqual(newSelection, {
      type: 'value',
      anchorPath: ['hello world'],
      focusPath: ['hello world'],
      edit: false
    })

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
    const state = syncState(json, undefined, [], () => true)

    const results = search('world', json, state)

    const { operations, newSelection } = createSearchAndReplaceOperations(
      json,
      state,
      '*',
      results[0]
    )

    assert.deepStrictEqual(operations, [
      { op: 'move', from: '/hello world', path: '/hello *' },
      { op: 'move', from: '/after', path: '/after' }
    ])

    assert.deepStrictEqual(newSelection, {
      type: 'key',
      anchorPath: ['hello *'],
      focusPath: ['hello *'],
      edit: false
    })

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      before: 'text',
      'hello *': 'hello world, hello WORLD, world',
      after: 'text'
    })
  })

  it('should create operations to replace a numeric value with a string', () => {
    const json = {
      value: 2
    }
    const state = syncState(json, undefined, [], () => true)

    const results = search('2', json, state)

    const { operations } = createSearchAndReplaceOperations(json, state, '*', results[0])

    assert.deepStrictEqual(operations, [{ op: 'replace', path: '/value', value: '*' }])

    const updatedJson = immutableJSONPatch(json, operations)
    assert.deepStrictEqual(updatedJson, {
      value: '*'
    })
  })

  it('should create operations to replace all search results', () => {
    const json = {
      before: 'text',
      'hello world': {
        'nested world': 'hello world, hello WORLD, world'
      },
      after: 'text'
    }
    const state = syncState(json, undefined, [], () => true)

    const searchText = 'world'
    const replacementText = '*'
    const { operations, newSelection } = createSearchAndReplaceAllOperations(
      json,
      state,
      searchText,
      replacementText
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

    assert.deepStrictEqual(newSelection, {
      anchorPath: ['hello *'],
      edit: false,
      focusPath: ['hello *'],
      type: 'key'
    })

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
    const state = syncState(json, undefined, [], () => true)

    const searchText = '2'
    const replacementText = '*'
    const { operations } = createSearchAndReplaceAllOperations(
      json,
      state,
      searchText,
      replacementText
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

  // TODO: test searchNext
  // TODO: test searchPrevious
})

// helper function to collect matches
function findAndCollectCaseInsensitiveMatches(text, searchTextLowerCase, path, field) {
  const matches = []

  findCaseInsensitiveMatches(text, searchTextLowerCase, path, field, (match) => matches.push(match))

  return matches
}
