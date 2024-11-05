import { test, describe } from 'vitest'
import assert from 'assert'
import {
  clipboardToValues,
  createNestedValueOperations,
  createNewValue,
  moveInsideParent,
  revertJSONPatchWithMoveOperations
} from './operations.js'
import { createMultiSelection } from './selection.js'
import { createDocumentState, documentStatePatch } from './documentState.js'
import type { JSONPatchOperation } from 'immutable-json-patch'
import { immutableJSONPatch } from 'immutable-json-patch'

describe('operations', () => {
  describe('createNewValue', () => {
    test('should create a value of type "value"', () => {
      assert.strictEqual(createNewValue({}, undefined, 'value'), '')
    })

    test('should create a value of type "object"', () => {
      assert.deepStrictEqual(createNewValue({}, undefined, 'object'), {})
    })

    test('should create a value of type "array"', () => {
      assert.deepStrictEqual(createNewValue({}, undefined, 'array'), [])
    })

    test('should create a simple value via type "structure"', () => {
      const json = [1, 2, 3]
      const path = ['0']
      const selection = createMultiSelection(path, path)

      assert.deepStrictEqual(createNewValue(json, selection, 'structure'), '')
    })

    test('should create a nested object via type "structure"', () => {
      const json = [
        {
          a: 2,
          b: {
            c: 3
          },
          d: [1, 2, 3]
        }
      ]
      const path = ['0']
      const selection = createMultiSelection(path, path)

      assert.deepStrictEqual(createNewValue(json, selection, 'structure'), {
        a: '',
        b: {
          c: ''
        },
        d: []
      })
    })
  })

  test('should turn clipboard text into an array with key/value pairs', () => {
    assert.deepStrictEqual(clipboardToValues('42', JSON), [{ key: 'New item', value: 42 }])

    assert.deepStrictEqual(clipboardToValues('Hello world', JSON), [
      { key: 'New item', value: 'Hello world' }
    ])

    assert.deepStrictEqual(clipboardToValues('"Hello world"', JSON), [
      { key: 'New item', value: 'Hello world' }
    ])

    assert.deepStrictEqual(clipboardToValues('[1,2,3]', JSON), [
      { key: 'New item', value: [1, 2, 3] }
    ])

    assert.deepStrictEqual(clipboardToValues('{"a": 2, "b": 3}', JSON), [
      { key: 'New item', value: { a: 2, b: 3 } }
    ])

    // partial array
    assert.deepStrictEqual(clipboardToValues('1, 2, 3,', JSON), [
      { key: 'New item 0', value: 1 },
      { key: 'New item 1', value: 2 },
      { key: 'New item 2', value: 3 }
    ])
    assert.deepStrictEqual(clipboardToValues('1,\n2,\n3,\n', JSON), [
      { key: 'New item 0', value: 1 },
      { key: 'New item 1', value: 2 },
      { key: 'New item 2', value: 3 }
    ])
    assert.deepStrictEqual(clipboardToValues('1,\n2,\n3\n', JSON), [
      { key: 'New item 0', value: 1 },
      { key: 'New item 1', value: 2 },
      { key: 'New item 2', value: 3 }
    ])
    assert.deepStrictEqual(clipboardToValues('{"id":1},{"id":2},{"id":3}', JSON), [
      { key: 'New item 0', value: { id: 1 } },
      { key: 'New item 1', value: { id: 2 } },
      { key: 'New item 2', value: { id: 3 } }
    ])

    // partial object
    assert.deepStrictEqual(clipboardToValues('"a": 2,\n"b": 3,\n', JSON), [
      { key: 'a', value: 2 },
      { key: 'b', value: 3 }
    ])
    assert.deepStrictEqual(clipboardToValues('"a": 2,\n"b": 3\n', JSON), [
      { key: 'a', value: 2 },
      { key: 'b', value: 3 }
    ])
  })

  describe('moveInsideParent', () => {
    test('should move a selection up inside an array', () => {
      const json = { array: [0, 1, 2, 3, 4, 5] }
      const documentState = createDocumentState({ json, expand: () => true })
      const selection = createMultiSelection(['array', '3'], ['array', '4'])
      const path = ['array', '1']
      const operations = moveInsideParent(json, selection, {
        beforePath: path,
        offset: 0
      })
      assert.deepStrictEqual(operations, [
        { op: 'move', from: '/array/3', path: '/array/1' },
        { op: 'move', from: '/array/4', path: '/array/2' }
      ])

      const updatedJson = documentStatePatch(json, documentState, operations).json
      assert.deepStrictEqual(updatedJson, { array: [0, 3, 4, 1, 2, 5] })
    })

    test('should move a selection down inside an array', () => {
      const json = { array: [0, 1, 2, 3, 4, 5] }
      const documentState = createDocumentState({ json, expand: () => true })
      const selection = createMultiSelection(['array', '1'], ['array', '2'])
      const path = ['array', '4']
      const operations = moveInsideParent(json, selection, {
        beforePath: path,
        offset: 0
      })
      assert.deepStrictEqual(operations, [
        { op: 'move', from: '/array/1', path: '/array/4' },
        { op: 'move', from: '/array/1', path: '/array/4' }
      ])

      const updatedJson = documentStatePatch(json, documentState, operations).json
      assert.deepStrictEqual(updatedJson, { array: [0, 3, 4, 1, 2, 5] })
    })

    test('should move a selection up inside an object', () => {
      const json = { object: { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e' } }
      const documentState = createDocumentState({ json, expand: () => true })
      const selection = createMultiSelection(['object', 'c'], ['object', 'd'])
      const path = ['object', 'b']
      const operations = moveInsideParent(json, selection, {
        beforePath: path,
        offset: 0
      })
      assert.deepStrictEqual(operations, [
        { op: 'move', from: '/object/b', path: '/object/b' },
        { op: 'move', from: '/object/e', path: '/object/e' }
      ])

      const { json: updatedJson, documentState: updatedDocumentState } = documentStatePatch(
        json,
        documentState,
        operations
      )
      assert.deepStrictEqual(updatedJson, { object: { a: 'a', c: 'c', d: 'd', b: 'b', e: 'e' } })
      assert.deepStrictEqual(updatedDocumentState, documentState)
      assert.deepStrictEqual(Object.keys(updatedJson.object), ['a', 'c', 'd', 'b', 'e'])
    })

    test('should move a selection down inside an object', () => {
      const json = { object: { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e' } }
      const documentState = createDocumentState({ json, expand: () => true })
      const selection = createMultiSelection(['object', 'b'], ['object', 'c'])
      const path = ['object', 'e']
      const operations = moveInsideParent(json, selection, {
        beforePath: path,
        offset: 0
      })
      assert.deepStrictEqual(operations, [
        { op: 'move', from: '/object/b', path: '/object/b' },
        { op: 'move', from: '/object/c', path: '/object/c' },
        { op: 'move', from: '/object/e', path: '/object/e' }
      ])

      const { json: updatedJson, documentState: updatedDocumentState } = documentStatePatch(
        json,
        documentState,
        operations
      )
      assert.deepStrictEqual(updatedJson, { object: { a: 'a', d: 'd', b: 'b', c: 'c', e: 'e' } })
      assert.deepStrictEqual(updatedDocumentState, documentState)
      assert.deepStrictEqual(Object.keys(updatedJson.object), ['a', 'd', 'b', 'c', 'e'])
    })

    // TODO: test append, moving to bottom of an array
    // TODO: test append, moving to bottom of an object
    // TODO: test moving up from the bottom of an array
    // TODO: test moving up from the bottom of an object
  })

  describe('revertJSONPatchWithMoveOperations', () => {
    test('should restore key order when reverting a remove operation ', () => {
      const json = {
        a: 2,
        b: 3,
        c: 4
      }
      assert.deepStrictEqual(Object.keys(json), ['a', 'b', 'c'])

      const operations: JSONPatchOperation[] = [{ op: 'remove', path: '/b' }]
      const updatedJson = immutableJSONPatch(json, operations)
      assert.deepStrictEqual(updatedJson, { a: 2, c: 4 })
      assert.deepStrictEqual(Object.keys(updatedJson), ['a', 'c'])

      const revertOperations = revertJSONPatchWithMoveOperations(json, operations)
      assert.deepStrictEqual(revertOperations, [
        { op: 'add', path: '/b', value: 3 },
        { op: 'move', from: '/c', path: '/c' }
      ])

      const revertedJson = immutableJSONPatch(updatedJson, revertOperations)
      assert.deepStrictEqual(revertedJson, json)
      assert.deepStrictEqual(Object.keys(revertedJson), ['a', 'b', 'c'])
    })

    test('should restore key order when reverting a move operation ', () => {
      const json = {
        a: 2,
        b: 3,
        c: 4,
        nested: {}
      }
      assert.deepStrictEqual(Object.keys(json), ['a', 'b', 'c', 'nested'])

      const operations: JSONPatchOperation[] = [{ op: 'move', from: '/b', path: '/nested/b' }]
      const updatedJson = immutableJSONPatch(json, operations)
      assert.deepStrictEqual(updatedJson, { a: 2, c: 4, nested: { b: 3 } })
      assert.deepStrictEqual(Object.keys(updatedJson), ['a', 'c', 'nested'])

      const revertOperations = revertJSONPatchWithMoveOperations(json, operations)
      assert.deepStrictEqual(revertOperations, [
        { op: 'move', from: '/nested/b', path: '/b' },
        { op: 'move', from: '/c', path: '/c' },
        { op: 'move', from: '/nested', path: '/nested' }
      ])

      const revertedJson = immutableJSONPatch(updatedJson, revertOperations)
      assert.deepStrictEqual(revertedJson, json)
      assert.deepStrictEqual(Object.keys(revertedJson), ['a', 'b', 'c', 'nested'])
    })

    test('should restore key order when sorting all keys of an object ', () => {
      const json = {
        b: 2,
        a: 1,
        c: 3
      }
      assert.deepStrictEqual(Object.keys(json), ['b', 'a', 'c'])

      const operations: JSONPatchOperation[] = [
        { op: 'move', from: '/a', path: '/a' },
        { op: 'move', from: '/b', path: '/b' },
        { op: 'move', from: '/c', path: '/c' }
      ]
      const updatedJson = immutableJSONPatch(json, operations)
      assert.deepStrictEqual(Object.keys(updatedJson as Record<string, number>), ['a', 'b', 'c'])

      const revertOperations = revertJSONPatchWithMoveOperations(json, operations)
      assert.deepStrictEqual(revertOperations, [
        { op: 'move', from: '/b', path: '/b' },
        { op: 'move', from: '/a', path: '/a' },
        { op: 'move', from: '/c', path: '/c' }
      ])

      const revertedJson = immutableJSONPatch(updatedJson, revertOperations)
      assert.deepStrictEqual(revertedJson, json)
      assert.deepStrictEqual(Object.keys(revertedJson), ['b', 'a', 'c'])
    })

    test('should restore correctly revert multiple remove operations in an array', () => {
      const json = [0, 1, 2, 3, 4]

      const operations: JSONPatchOperation[] = [
        { op: 'remove', path: '/4' },
        { op: 'remove', path: '/3' },
        { op: 'remove', path: '/2' }
      ]

      const updatedJson = immutableJSONPatch(json, operations)
      assert.deepStrictEqual(updatedJson, [0, 1])

      const revertOperations = revertJSONPatchWithMoveOperations(json, operations)
      assert.deepStrictEqual(revertOperations, [
        { op: 'add', path: '/2', value: 2 },
        { op: 'add', path: '/3', value: 3 },
        { op: 'add', path: '/4', value: 4 }
      ])

      const revertedJson = immutableJSONPatch(updatedJson, revertOperations)
      assert.deepStrictEqual(revertedJson, json)
    })
  })

  describe('createNestedValueOperations', () => {
    test('should create parent object operation of a nest value when missing', () => {
      const json = {}

      const operations: JSONPatchOperation[] = [{ op: 'replace', path: '/nested/value', value: 42 }]
      const updatedOperations = createNestedValueOperations(operations, json)

      assert.deepStrictEqual(updatedOperations, [
        { op: 'add', path: '/nested', value: {} },
        { op: 'replace', path: '/nested/value', value: 42 }
      ])
    })

    test('should create parent object operation of a nest value in an array when missing', () => {
      const json = [{}, {}, {}]

      const operations: JSONPatchOperation[] = [
        { op: 'replace', path: '/2/nested/value', value: 42 }
      ]
      const updatedOperations = createNestedValueOperations(operations, json)

      assert.deepStrictEqual(updatedOperations, [
        { op: 'add', path: '/2/nested', value: {} },
        { op: 'replace', path: '/2/nested/value', value: 42 }
      ])
    })

    test('should create parent object operation of a deep nest value when missing', () => {
      const json = {}

      const operations: JSONPatchOperation[] = [
        { op: 'replace', path: '/deep/nested/value', value: 42 }
      ]
      const updatedOperations = createNestedValueOperations(operations, json)

      assert.deepStrictEqual(updatedOperations, [
        { op: 'add', path: '/deep', value: {} },
        { op: 'add', path: '/deep/nested', value: {} },
        { op: 'replace', path: '/deep/nested/value', value: 42 }
      ])
    })

    test('should not create parent objects when already existing', () => {
      const json = { deep: { nested: {} } }

      const operations: JSONPatchOperation[] = [
        { op: 'replace', path: '/deep/nested/value', value: 42 }
      ]
      const updatedOperations = createNestedValueOperations(operations, json)

      assert.deepStrictEqual(updatedOperations, operations)
    })
  })

  // TODO: write tests for all operations
})
