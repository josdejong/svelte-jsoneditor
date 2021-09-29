import assert from 'assert'
import { STATE_KEYS, STATE_SEARCH_PROPERTY, STATE_SEARCH_VALUE } from '../constants.js'
import { syncState } from './documentState.js'
import {
  createRecursiveSearchResults,
  findCaseInsensitiveMatches,
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
      findCaseInsensitiveMatches('hello world, Hello world', 'hello', path, field),
      [
        { path, field, fieldIndex: 0, start: 0, end: 5, active: false },
        { path, field, fieldIndex: 1, start: 13, end: 18, active: false }
      ]
    )

    assert.deepStrictEqual(findCaseInsensitiveMatches('hahaha', 'haha', path, field), [
      { path, field, fieldIndex: 0, start: 0, end: 4, active: false }
    ])
    assert.deepStrictEqual(findCaseInsensitiveMatches('hahahahaha', 'haha', path, field), [
      { path, field, fieldIndex: 0, start: 0, end: 4, active: false },
      { path, field, fieldIndex: 1, start: 4, end: 8, active: false }
    ])

    assert.deepStrictEqual(
      findCaseInsensitiveMatches('hello world, Hello world', 'greeting', path, field),
      undefined
    )
  })

  it('should split search results', () => {
    const text = 'hello world, HELLO!'
    const searchTextLowerCase = 'hello'
    const path = []
    const field = STATE_SEARCH_VALUE
    const searchResults = findCaseInsensitiveMatches(text, searchTextLowerCase, path, field)

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

  // TODO: test searchNext
  // TODO: test searchPrevious
})
