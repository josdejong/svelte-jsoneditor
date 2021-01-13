import assert from 'assert'
import { times } from 'lodash-es'
import { syncState } from './documentState.js'
import { searchAsync, searchGenerator, createRecursiveSearchResults } from './search.js'
import {
  SEARCH_RESULT, STATE_KEYS,
  STATE_SEARCH_PROPERTY,
  STATE_SEARCH_VALUE
} from '../constants.js'

describe('search', () => {
  it('should search with generator', () => {
    const doc = {
      b: { c: 'a' },
      a: [
        { a: 'b', c: 'a' },
        'e',
        'a'
      ]
    }

    const search = searchGenerator('a', doc, undefined)

    assert.deepStrictEqual(search.next(), { done: false, value: ['b', 'c', STATE_SEARCH_VALUE] })
    assert.deepStrictEqual(search.next(), { done: false, value: ['a', STATE_SEARCH_PROPERTY] })
    assert.deepStrictEqual(search.next(), { done: false, value: ['a', 0, 'a', STATE_SEARCH_PROPERTY] })
    assert.deepStrictEqual(search.next(), { done: false, value: ['a', 0, 'c', STATE_SEARCH_VALUE] })
    assert.deepStrictEqual(search.next(), { done: false, value: ['a', 2, STATE_SEARCH_VALUE] })
    assert.deepStrictEqual(search.next(), { done: true, value: undefined })
  })

  it('should yield every x items during search', () => {
    const doc = times(30, index => String(index))

    const search = searchGenerator('4', doc, undefined, 10)
    assert.deepStrictEqual(search.next(), { done: false, value: [4, STATE_SEARCH_VALUE] })
    assert.deepStrictEqual(search.next(), { done: false, value: null }) // at 10
    assert.deepStrictEqual(search.next(), { done: false, value: [14, STATE_SEARCH_VALUE] })
    assert.deepStrictEqual(search.next(), { done: false, value: null }) // at 20
    assert.deepStrictEqual(search.next(), { done: false, value: [24, STATE_SEARCH_VALUE] })
    assert.deepStrictEqual(search.next(), { done: false, value: null }) // at 30
    assert.deepStrictEqual(search.next(), { done: true, value: undefined })
  })

  it('should search async', (done) => {
    const doc = times(30, index => String(index))

    const callbacks = []

    function onProgress (results) {
      callbacks.push(results.slice(0))
    }

    function onDone (results) {
      assert.deepStrictEqual(results, [
        [4, STATE_SEARCH_VALUE],
        [14, STATE_SEARCH_VALUE],
        [24, STATE_SEARCH_VALUE]
      ])

      assert.deepStrictEqual(callbacks, [
        results.slice(0, 1),
        results.slice(0, 2),
        results.slice(0, 3)
      ])

      done()
    }

    const yieldAfterItemCount = 1
    searchAsync('4', doc, undefined, { onProgress, onDone, yieldAfterItemCount })

    // should not have results right after creation, but only on the first next tick
    assert.deepStrictEqual(callbacks, [])
  })

  it('should cancel async search', (done) => {
    const doc = times(30, index => String(index))

    const callbacks = []

    function onProgress (results) {
      callbacks.push(results.slice(0))
    }

    function onDone () {
      throw new Error('onDone should not be invoked')
    }

    const yieldAfterItemCount = 1 // very low so we can see whether actually cancelled
    const { cancel } = searchAsync('4', doc, undefined, { onProgress, onDone, yieldAfterItemCount })

    setTimeout(() => {
      cancel()

      setTimeout(() => {
        assert.deepStrictEqual(callbacks, [])

        done()
      }, 100) // FIXME: this is tricky, relying on a delay to test whether actually cancelled
    })
  })

  it('should respect order of keys in document state in async search', () => {
    return new Promise ((resolve, reject) => {
      const doc = {
        data: {
          'text1': 'foo',
          'text2': 'foo'
        }
      }

      const state = syncState(doc, undefined, [], () => true)
      state.data[STATE_KEYS] = ['text2', 'text1'] // reverse the order of the keys

      function onDone (results) {
        try {
          assert.deepStrictEqual(results, [
            [ 'data', 'text2', STATE_SEARCH_VALUE ],
            [ 'data', 'text1', STATE_SEARCH_VALUE ]
          ])
          resolve()
        } catch (err) {
          reject(err)
        }
      }

      searchAsync('foo', doc, state, { onDone })
    })
  })

  it('should limit async search results', (done) => {
    const doc = times(30, index => 'item ' + index)

    function onDone (results) {
      assert.strictEqual(results.length, 10)
      done()
    }

    const maxResults = 10
    searchAsync('item', doc, undefined, { onDone, maxResults })
  })

  it('should generate recursive search results from flat results', () => {
    // Based on document:
    const doc = {
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

    const actual = createRecursiveSearchResults(doc, flatResults)
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
