import { describe, test, expect } from 'vitest'
import assert from 'assert'
import {
  arrayStartsWith,
  arrayToObject,
  compareArrays,
  dedupeKeepLast,
  forEachSample,
  getNestedPaths,
  moveItems,
  objectToArray
} from './arrayUtils.js'

describe('arrayUtils', () => {
  test('compareArrays', () => {
    assert.strictEqual(compareArrays([], []), 0)
    assert.strictEqual(compareArrays(['a'], ['a']), 0)
    assert.strictEqual(compareArrays(['a'], ['b']), -1)
    assert.strictEqual(compareArrays(['b'], ['a']), 1)
    assert.strictEqual(compareArrays(['a'], ['a', 'b']), -1)
    assert.strictEqual(compareArrays(['a', 'b'], ['a']), 1)
    assert.strictEqual(compareArrays(['a', 'b'], ['a', 'b']), 0)

    const arrays = [['b', 'a'], ['a'], [], ['b', 'c'], ['b']]

    assert.deepStrictEqual(arrays.sort(compareArrays), [[], ['a'], ['b'], ['b', 'a'], ['b', 'c']])
  })

  describe('getNestedPaths', () => {
    test('should extract all nested paths of an array containing objects', () => {
      const json = [
        { name: 'A', location: { latitude: 1, longitude: 2 } },
        { name: 'B', location: { latitude: 1, longitude: 2 } },
        { name: 'C', timestamp: 0 }
      ]

      assert.deepStrictEqual(getNestedPaths(json), [
        ['location', 'latitude'],
        ['location', 'longitude'],
        ['name'],
        ['timestamp']
      ])
    })

    test('should extract a path containing an empty key', () => {
      const json = [{ '': 'empty' }]

      assert.deepStrictEqual(getNestedPaths(json), [['']])
    })

    test('should extract all nested paths of an array containing objects, including objects', () => {
      const json = [
        { name: 'A', location: { latitude: 1, longitude: 2 } },
        { name: 'B', location: { latitude: 1, longitude: 2 } },
        { name: 'C', timestamp: 0 }
      ]

      assert.deepStrictEqual(getNestedPaths(json, true), [
        ['location'],
        ['location', 'latitude'],
        ['location', 'longitude'],
        ['name'],
        ['timestamp']
      ])
    })

    test('should extract all nested paths of an array containing values', () => {
      const json = [1, 2, 3]

      assert.deepStrictEqual(getNestedPaths(json), [[]])
    })

    test('should throw an error when not passing an array', () => {
      assert.throws(() => getNestedPaths({ a: 2, b: { c: 3 } }), /TypeError: Array expected/)
      assert.throws(() => getNestedPaths('foo'), /TypeError: Array expected/)
      assert.throws(() => getNestedPaths(123), /TypeError: Array expected/)
    })
  })

  describe('arrayToObject', () => {
    test('should convert an array to an object', () => {
      assert.deepStrictEqual(arrayToObject([1, 2, 3]), { 0: 1, 1: 2, 2: 3 })
    })
  })

  describe('objectToArray', () => {
    test('should convert an object to an array', () => {
      assert.deepStrictEqual(objectToArray({ 0: 1, 1: 2, 2: 3 }), [1, 2, 3])
      assert.deepStrictEqual(objectToArray({ 2: 3, 1: 2, 0: 1 }), [1, 2, 3])
      assert.deepStrictEqual(objectToArray({ 0: 1, 2: 3 }), [1, 3])
      assert.deepStrictEqual(objectToArray({ a: 1, b: 2 }), [1, 2])
    })
  })

  describe('arrayStartsWith', () => {
    test('should test whether an array starts with the specified sub array', () => {
      assert.strictEqual(arrayStartsWith([1, 2, 3], [1, 2]), true)
      assert.strictEqual(arrayStartsWith([1, 2], [1, 2]), true)
      assert.strictEqual(arrayStartsWith([1], [1, 2]), false)

      assert.strictEqual(
        arrayStartsWith([{ id: 1 }, { id: 2 }, { id: 3 }], [{ id: 1 }, { id: 2 }]),
        true
      )
      assert.strictEqual(
        arrayStartsWith([{ id: 1 }, { id: 42 }, { id: 3 }], [{ id: 1 }, { id: 2 }]),
        false
      )
    })

    test('should use custom equality check in arrayStartsWith', () => {
      type User = { id: number; name?: string }
      const users: User[] = [{ id: 1 }, { id: 2, name: 'Joe' }, { id: 3 }]
      const equalUserId = (a: User, b: User) => a.id === b.id
      const searchArray = [{ id: 1 }, { id: 2 }]

      assert.strictEqual(arrayStartsWith(users, searchArray), false)
      assert.strictEqual(arrayStartsWith(users, searchArray, equalUserId), true)
    })
  })

  describe('moveItems', () => {
    test('should move array items up', () => {
      assert.deepStrictEqual(moveItems([1, 2, 3, 4, 5], 2, 1, -1), [1, 3, 2, 4, 5])
      assert.deepStrictEqual(moveItems([1, 2, 3, 4, 5], 2, 2, -1), [1, 3, 4, 2, 5])
      assert.deepStrictEqual(moveItems([1, 2, 3, 4, 5], 2, 2, -2), [3, 4, 1, 2, 5])
    })

    test('should move array items down', () => {
      assert.deepStrictEqual(moveItems([1, 2, 3, 4, 5], 1, 1, 1), [1, 3, 2, 4, 5])
      assert.deepStrictEqual(moveItems([1, 2, 3, 4, 5], 1, 2, 1), [1, 4, 2, 3, 5])
      assert.deepStrictEqual(moveItems([1, 2, 3, 4, 5], 1, 2, 2), [1, 4, 5, 2, 3])
    })
  })

  describe('forEachSample', () => {
    function sample<T>(array: T[], maxSampleCount: number): T[] {
      const sampled: T[] = []

      forEachSample(array, maxSampleCount, (item) => sampled.push(item))

      return sampled
    }

    test('should sample an array', () => {
      expect(sample([0, 1, 2, 3], Infinity)).toEqual([0, 1, 2, 3])
      expect(sample([0, 1, 2, 3], 100)).toEqual([0, 1, 2, 3])
      expect(sample([0, 1, 2, 3], 2)).toEqual([0, 3])
      expect(sample([0, 1, 2, 3], 1)).toEqual([0])
      expect(sample([0, 1, 2, 3], 0)).toEqual([])

      expect(sample([0, 1, 2, 3, 4], 2)).toEqual([0, 4])
      expect(sample([0, 1, 2, 3, 4], 3)).toEqual([0, 2, 4])
      expect(sample([0, 1, 2, 3, 4], 4)).toEqual([0, 1, 2, 4])

      expect(sample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4)).toEqual([0, 3, 6, 9])

      expect(sample([], 4)).toEqual([])
    })
  })

  describe('dedupeKeepLast', () => {
    test('should keep the last item in case of a duplicate', () => {
      expect(dedupeKeepLast([3, 1, 3])).toEqual([1, 3])
      expect(dedupeKeepLast([3, 1, 3, 3])).toEqual([1, 3])

      expect(
        dedupeKeepLast([
          { id: 1, name: 'Joe' },
          { id: 3, name: 'Sarah' },
          { id: 1, name: 'Joe' }
        ])
      ).toEqual([
        { id: 3, name: 'Sarah' },
        { id: 1, name: 'Joe' }
      ])

      expect(
        dedupeKeepLast([
          { id: 1, name: 'Joe' },
          { id: 3, name: 'Sarah' },
          { id: 1, name: 'Joey' }
        ])
      ).toEqual([
        { id: 1, name: 'Joe' },
        { id: 3, name: 'Sarah' },
        { id: 1, name: 'Joey' }
      ])
    })

    test('should pass a custom comparator', () => {
      const comparator = (a: Record<string, unknown>, b: Record<string, unknown>) => a.id === b.id

      const input = [{ id: 1, name: 'Joe' }, { id: 3 }, { id: 1, name: 'Joey' }]
      const expected = [{ id: 3 }, { id: 1, name: 'Joey' }]

      expect(dedupeKeepLast(input, comparator)).toEqual(expected)
    })
  })
})
