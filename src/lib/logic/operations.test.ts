import assert from 'assert'
import {
  clipboardToValues,
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
    it('should create a value of type "value"', () => {
      assert.strictEqual(createNewValue({}, null, 'value'), '')
    })

    it('should create a value of type "object"', () => {
      assert.deepStrictEqual(createNewValue({}, null, 'object'), {})
    })

    it('should create a value of type "array"', () => {
      assert.deepStrictEqual(createNewValue({}, null, 'array'), [])
    })

    it('should create a simple value via type "structure"', () => {
      const json = [1, 2, 3]
      const path = ['0']
      const selection = createMultiSelection(json, path, path)

      assert.deepStrictEqual(createNewValue(json, selection, 'structure'), '')
    })

    it('should create a nested object via type "structure"', () => {
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
      const selection = createMultiSelection(json, path, path)

      assert.deepStrictEqual(createNewValue(json, selection, 'structure'), {
        a: '',
        b: {
          c: ''
        },
        d: []
      })
    })
  })

  it('should turn clipboard text into an array with key/value pairs', () => {
    assert.deepStrictEqual(clipboardToValues('42'), [{ key: 'New item', value: 42 }])

    assert.deepStrictEqual(clipboardToValues('Hello world'), [
      { key: 'New item', value: 'Hello world' }
    ])

    assert.deepStrictEqual(clipboardToValues('"Hello world"'), [
      { key: 'New item', value: 'Hello world' }
    ])

    assert.deepStrictEqual(clipboardToValues('[1,2,3]'), [{ key: 'New item', value: [1, 2, 3] }])

    assert.deepStrictEqual(clipboardToValues('{"a": 2, "b": 3}'), [
      { key: 'New item', value: { a: 2, b: 3 } }
    ])

    // partial array
    assert.deepStrictEqual(clipboardToValues('1, 2, 3,'), [
      { key: 'New item 0', value: 1 },
      { key: 'New item 1', value: 2 },
      { key: 'New item 2', value: 3 }
    ])
    assert.deepStrictEqual(clipboardToValues('1,\n2,\n3,\n'), [
      { key: 'New item 0', value: 1 },
      { key: 'New item 1', value: 2 },
      { key: 'New item 2', value: 3 }
    ])
    assert.deepStrictEqual(clipboardToValues('1,\n2,\n3\n'), [
      { key: 'New item 0', value: 1 },
      { key: 'New item 1', value: 2 },
      { key: 'New item 2', value: 3 }
    ])
    assert.deepStrictEqual(clipboardToValues('{"id":1},{"id":2},{"id":3}'), [
      { key: 'New item 0', value: { id: 1 } },
      { key: 'New item 1', value: { id: 2 } },
      { key: 'New item 2', value: { id: 3 } }
    ])

    // partial object
    assert.deepStrictEqual(clipboardToValues('"a": 2,\n"b": 3,\n'), [
      { key: 'a', value: 2 },
      { key: 'b', value: 3 }
    ])
    assert.deepStrictEqual(clipboardToValues('"a": 2,\n"b": 3\n'), [
      { key: 'a', value: 2 },
      { key: 'b', value: 3 }
    ])
  })

  describe('moveInsideParent', () => {
    it('should move a selection up inside an array', () => {
      const json = { array: [0, 1, 2, 3, 4, 5] }
      const documentState = createDocumentState({
        json,
        select: (json) => createMultiSelection(json, ['array', '3'], ['array', '4'])
      })
      const path = ['array', '1']
      const operations = moveInsideParent(json, documentState.selection, {
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

    it('should move a selection down inside an array', () => {
      const json = { array: [0, 1, 2, 3, 4, 5] }
      const documentState = createDocumentState({
        json,
        select: (json) => createMultiSelection(json, ['array', '1'], ['array', '2'])
      })
      const path = ['array', '4']
      const operations = moveInsideParent(json, documentState.selection, {
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

    it('should move a selection up inside an object', () => {
      const json = { object: { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e' } }
      const documentState = createDocumentState({
        json,
        select: (json) => createMultiSelection(json, ['object', 'c'], ['object', 'd']),
        expand: () => true
      })
      const path = ['object', 'b']
      const operations = moveInsideParent(json, documentState.selection, {
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

    it('should move a selection down inside an object', () => {
      const json = { object: { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e' } }
      const documentState = createDocumentState({
        json,
        select: (json) => createMultiSelection(json, ['object', 'b'], ['object', 'c']),
        expand: () => true
      })
      const path = ['object', 'e']
      const operations = moveInsideParent(json, documentState.selection, {
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
    it('should restore key order when reverting a remove operation ', () => {
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

    it('should restore key order when reverting a move operation ', () => {
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

    it('should restore correctly revert multiple remove operations in an array', () => {
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

  // TODO: write tests for all operations
})
