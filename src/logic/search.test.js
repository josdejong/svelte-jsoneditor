import assert from 'assert'
import {
  SEARCH_RESULT,
  STATE_KEYS,
  STATE_SEARCH_PROPERTY,
  STATE_SEARCH_VALUE
} from '../constants.js'
import { syncState } from './documentState.js'
import { createRecursiveSearchResults, search } from './search.js'

describe('search', () => {
  it('search in JSON', () => {
    const json = {
      b: { c: 'a' },
      a: [
        { a: 'b', c: 'a' },
        'e',
        'a'
      ]
    }

    const results = search('a', json, undefined)

    assert.deepStrictEqual(results, [
      ['b', 'c', STATE_SEARCH_VALUE],
      ['a', STATE_SEARCH_PROPERTY],
      ['a', 0, 'a', STATE_SEARCH_PROPERTY],
      ['a', 0, 'c', STATE_SEARCH_VALUE],
      ['a', 2, STATE_SEARCH_VALUE]
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
      ['data', 'text2', STATE_SEARCH_VALUE],
      ['data', 'text1', STATE_SEARCH_VALUE]
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

  it('should generate recursive search results from flat results', () => {
    // Based on document:
    const json = {
      b: { c: 'a' },
      a: [
        { a: 'b', c: 'a' },
        'e',
        'a'
      ]
    }

    // search results for 'a':
    const flatResults = [
      ['b', 'c', STATE_SEARCH_VALUE],
      ['a', STATE_SEARCH_PROPERTY], // This is a tricky one: we can't guarantee creating a as Array without having the reference document
      ['a', 0, 'a', STATE_SEARCH_PROPERTY],
      ['a', 0, 'c', STATE_SEARCH_VALUE],
      ['a', 2, STATE_SEARCH_VALUE]
    ]

    const actual = createRecursiveSearchResults(json, flatResults)
    const expected = {}

    expected.b = {}
    expected.b.c = {}
    expected.b.c[STATE_SEARCH_VALUE] = SEARCH_RESULT
    expected.a = []
    expected.a[STATE_SEARCH_PROPERTY] = SEARCH_RESULT
    expected.a[0] = {}
    expected.a[0].a = {}
    expected.a[0].a[STATE_SEARCH_PROPERTY] = SEARCH_RESULT
    expected.a[0].c = {}
    expected.a[0].c[STATE_SEARCH_VALUE] = SEARCH_RESULT
    expected.a[2] = {}
    expected.a[2][STATE_SEARCH_VALUE] = SEARCH_RESULT

    assert.deepStrictEqual(actual, expected)
  })

  // TODO: test searchNext
  // TODO: test searchPrevious
})
