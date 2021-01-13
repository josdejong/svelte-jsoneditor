import assert from 'assert'
import { compareArrays, getNestedPaths } from './arrayUtils.js'

describe('arrayUtils', () => {
  it('compareArrays', () => {
    assert.strictEqual(compareArrays([], []), 0)
    assert.strictEqual(compareArrays(['a'], ['a']), 0)
    assert.strictEqual(compareArrays(['a'], ['b']), -1)
    assert.strictEqual(compareArrays(['b'], ['a']), 1)
    assert.strictEqual(compareArrays(['a'], ['a', 'b']), -1)
    assert.strictEqual(compareArrays(['a', 'b'], ['a']), 1)
    assert.strictEqual(compareArrays(['a', 'b'], ['a', 'b']), 0)

    const arrays = [
      ['b', 'a'],
      ['a'],
      [],
      ['b', 'c'],
      ['b']
    ]

    assert.deepStrictEqual(arrays.sort(compareArrays), [
      [],
      ['a'],
      ['b'],
      ['b', 'a'],
      ['b', 'c']
    ])
  })

  describe('getNestedPaths', () => {
    it('should extract all nested paths of an array containing objects', () => {
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

    it('should extract a path containing an empty key', () => {
      const json = [
        { '': 'empty' }
      ]

      assert.deepStrictEqual(getNestedPaths(json), [
        ['']
      ])
    })

    it('should extract all nested paths of an array containing objects, including objects', () => {
      const json = [
        { name: 'A', location: { latitude: 1, longitude: 2 } },
        { name: 'B', location: { latitude: 1, longitude: 2 } },
        { name: 'C', timestamp: 0 }
      ]

      assert.deepStrictEqual(getNestedPaths(json, true), [
        [],
        ['location'],
        ['location', 'latitude'],
        ['location', 'longitude'],
        ['name'],
        ['timestamp']
      ])
    })

    it('should extract all nested paths of an array containing values', () => {
      const json = [1, 2, 3]

      assert.deepStrictEqual(getNestedPaths(json), [
        []
      ])
    })

    it('should throw an error when not passing an array', () => {
      assert.throws(() => getNestedPaths({ a: 2, b: { c: 3 } }), /TypeError: Array expected/)
      assert.throws(() => getNestedPaths('foo'), /TypeError: Array expected/)
      assert.throws(() => getNestedPaths(123), /TypeError: Array expected/)
    })
  })
})
