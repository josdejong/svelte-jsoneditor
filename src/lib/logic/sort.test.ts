import { test, describe } from 'vitest'
import assert from 'assert'
import { immutableJSONPatch } from 'immutable-json-patch'
import { sortBy } from 'lodash-es'
import {
  fastPatchSort,
  sortArray,
  sortJson,
  sortObjectKeys,
  sortOperationsMove,
  sortOperationsMoveAdvanced
} from './sort.js'

describe('sort', () => {
  describe('sortJson', () => {
    test('should sort an arbitrary json object in ascending order', () => {
      const object = { b: 1, c: 1, a: 1 }

      assert.deepStrictEqual(sortJson(object, undefined, undefined, 1), [
        { op: 'replace', path: '', value: { a: 1, b: 1, c: 1 } }
      ])
    })

    test('should sort an arbitrary json object in descending order', () => {
      const object = { b: 1, c: 1, a: 1 }

      assert.deepStrictEqual(sortJson(object, undefined, undefined, -1), [
        { op: 'replace', path: '', value: { c: 1, b: 1, a: 1 } }
      ])
    })

    test('should sort a nested object inside an object', () => {
      const object = {
        root: {
          path: { b: 1, c: 1, a: 1 }
        }
      }

      assert.deepStrictEqual(sortJson(object, ['root', 'path']), [
        { op: 'replace', path: '/root/path', value: { a: 1, b: 1, c: 1 } }
      ])
    })

    test('should sort a nested object inside an array', () => {
      const object = [{ b: 1, c: 1, a: 1 }]

      assert.deepStrictEqual(sortJson(object, ['0']), [
        { op: 'replace', path: '/0', value: { a: 1, b: 1, c: 1 } }
      ])
    })

    test('should sort an array', () => {
      assert.deepStrictEqual(sortJson([2, 3, 1]), [{ op: 'replace', path: '', value: [1, 2, 3] }])
      assert.deepStrictEqual(sortJson([2, 3, 1], undefined, undefined, -1), [
        { op: 'replace', path: '', value: [3, 2, 1] }
      ])
    })

    test('should sort array by nested properties and a direction', () => {
      const a = { data: { value: 1 } }
      const b = { data: { value: 2 } }
      const c = { data: { value: 3 } }

      assert.deepStrictEqual(sortJson([b, a, c], undefined, ['data', 'value']), [
        { op: 'replace', path: '', value: [a, b, c] }
      ])
      assert.deepStrictEqual(sortJson([b, a, c], undefined, ['data', 'value'], 1), [
        { op: 'replace', path: '', value: [a, b, c] }
      ])
      assert.deepStrictEqual(sortJson([b, a, c], undefined, ['data', 'value'], -1), [
        { op: 'replace', path: '', value: [c, b, a] }
      ])
    })

    test('should sort array using a rootPath', () => {
      const json = {
        root: {
          path: [2, 3, 1]
        }
      }

      assert.deepStrictEqual(sortJson(json, ['root', 'path']), [
        { op: 'replace', path: '/root/path', value: [1, 2, 3] }
      ])
    })
  })

  test('should sort object keys', () => {
    const object = { b: 1, c: 1, a: 1 }

    assert.deepStrictEqual(sortObjectKeys(object), [
      { op: 'replace', path: '', value: { a: 1, b: 1, c: 1 } }
    ])

    assert.deepStrictEqual(sortObjectKeys(object, undefined, 1), [
      { op: 'replace', path: '', value: { a: 1, b: 1, c: 1 } }
    ])

    assert.deepStrictEqual(sortObjectKeys(object, undefined, -1), [
      { op: 'replace', path: '', value: { c: 1, b: 1, a: 1 } }
    ])
  })

  test('should sort object keys using a rootPath', () => {
    const object = {
      root: {
        path: { b: 1, c: 1, a: 1 }
      }
    }

    assert.deepStrictEqual(sortObjectKeys(object, ['root', 'path']), [
      { op: 'replace', path: '/root/path', value: { a: 1, b: 1, c: 1 } }
    ])
  })

  test('should sort object keys case insensitive', () => {
    const object = { B: 1, a: 1 }

    assert.deepStrictEqual(sortObjectKeys(object), [
      { op: 'replace', path: '', value: { a: 1, B: 1 } }
    ])
  })

  test('should sort array', () => {
    assert.deepStrictEqual(sortArray([2, 3, 1]), [{ op: 'replace', path: '', value: [1, 2, 3] }])
    assert.deepStrictEqual(sortArray([2, 3, 1], undefined, undefined, -1), [
      { op: 'replace', path: '', value: [3, 2, 1] }
    ])
  })

  test('should sort array using natural sort', () => {
    assert.deepStrictEqual(sortArray(['10', '2', '1']), [
      { op: 'replace', path: '', value: ['1', '2', '10'] }
    ])
  })

  test('should sort array case insensitive', () => {
    assert.deepStrictEqual(sortArray(['B', 'a']), [{ op: 'replace', path: '', value: ['a', 'B'] }])
  })

  test('should sort array using a rootPath', () => {
    const json = {
      root: {
        path: [2, 3, 1]
      }
    }

    assert.deepStrictEqual(sortArray(json, ['root', 'path']), [
      { op: 'replace', path: '/root/path', value: [1, 2, 3] }
    ])
  })

  test('should sort array by nested properties and a direction', () => {
    const a = { data: { value: 1 } }
    const b = { data: { value: 2 } }
    const c = { data: { value: 3 } }

    assert.deepStrictEqual(sortArray([b, a, c], undefined, ['data', 'value']), [
      { op: 'replace', path: '', value: [a, b, c] }
    ])
    assert.deepStrictEqual(sortArray([b, a, c], undefined, ['data', 'value'], 1), [
      { op: 'replace', path: '', value: [a, b, c] }
    ])
    assert.deepStrictEqual(sortArray([b, a, c], undefined, ['data', 'value'], -1), [
      { op: 'replace', path: '', value: [c, b, a] }
    ])
  })

  test('should generate the move operations needed to sort given array', () => {
    const comparator = (a: number, b: number) => a - b

    assert.deepStrictEqual(sortOperationsMove([1, 2, 3], comparator), [])

    assert.deepStrictEqual(sortOperationsMove([2, 3, 1], comparator), [
      { op: 'move', from: '/2', path: '/0' }
    ])

    assert.deepStrictEqual(sortOperationsMove([2, 1, 3], comparator), [
      { op: 'move', from: '/1', path: '/0' }
    ])

    assert.deepStrictEqual(sortOperationsMove([1, 3, 2], comparator), [
      { op: 'move', from: '/2', path: '/1' }
    ])

    assert.deepStrictEqual(sortOperationsMove([3, 2, 1], comparator), [
      { op: 'move', from: '/1', path: '/0' },
      { op: 'move', from: '/2', path: '/0' }
    ])

    // Note: more efficient would be to { fromIndex: 0, toIndex: 2 }
    assert.deepStrictEqual(sortOperationsMove([3, 1, 2], comparator), [
      { op: 'move', from: '/1', path: '/0' },
      { op: 'move', from: '/2', path: '/1' }
    ])

    // just double check that the move operations indeed sort the contents
    const array = [0, 1, 3, 5, 4, 2]
    const operations = sortOperationsMove(array, comparator)
    assert.deepStrictEqual(immutableJSONPatch(array, operations), [0, 1, 2, 3, 4, 5])
  })

  test('should generate the move operations to sort given array (2)', () => {
    const comparator = (a: number, b: number) => a - b

    assert.deepStrictEqual(sortOperationsMoveAdvanced([1, 2, 3, 6, 4, 5], comparator), [
      { op: 'move', from: '/3', path: '/5' }
    ])

    assert.deepStrictEqual(sortOperationsMoveAdvanced([2, 3, 4, 1, 5, 6], comparator), [
      { op: 'move', from: '/3', path: '/0' }
    ])

    {
      const array = [3, 1, 2, 5, 4, 6]
      const operations = sortOperationsMoveAdvanced(array, comparator)
      assert.deepStrictEqual(immutableJSONPatch(array, operations), sortBy(array))
      assert.deepStrictEqual(operations, [
        { op: 'move', from: '/0', path: '/3' },
        { op: 'move', from: '/2', path: '/4' }
      ])
    }

    {
      const array = [0, 1, 3, 5, 4, 2]
      const operations = sortOperationsMoveAdvanced(array, comparator)
      assert.deepStrictEqual(immutableJSONPatch(array, operations), sortBy(array))
      assert.deepStrictEqual(operations, [
        { op: 'move', from: '/5', path: '/2' },
        { op: 'move', from: '/4', path: '/5' }
      ])
    }
  })

  test('should fast apply move operations', () => {
    const comparator = (a: number, b: number) => a - b

    const array = [0, 1, 3, 5, 4, 2]
    const operations = sortOperationsMoveAdvanced(array, comparator)
    assert.deepStrictEqual(fastPatchSort(array, operations), sortBy(array))
  })

  test('should give the move operations needed to sort given array containing objects', () => {
    const comparator = (a: { id: number }, b: { id: number }) => a.id - b.id

    const actual = sortOperationsMove([{ id: 4 }, { id: 3 }, { id: 1 }, { id: 2 }], comparator)

    const expected = [
      { op: 'move', from: '/1', path: '/0' },
      { op: 'move', from: '/2', path: '/0' },
      { op: 'move', from: '/3', path: '/1' }
    ]

    assert.deepStrictEqual(actual, expected)
  })

  test('should give the move operations needed to sort given array containing objects (advanced)', () => {
    const comparator = (a: { id: number }, b: { id: number }) => a.id - b.id

    const actual = sortOperationsMoveAdvanced(
      [{ id: 4 }, { id: 3 }, { id: 1 }, { id: 2 }],
      comparator
    )

    const expected = [
      { op: 'move', from: '/1', path: '/3' },
      { op: 'move', from: '/0', path: '/3' }
    ]

    assert.deepStrictEqual(actual, expected)
  })
})
