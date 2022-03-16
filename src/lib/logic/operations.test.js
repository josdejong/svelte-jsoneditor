import assert from 'assert'
import { clipboardToValues, createNewValue, moveInsideParent } from './operations.js'
import { createSelection, SELECTION_TYPE } from './selection.js'
import { createState, documentStatePatch, getKeys, syncState } from './documentState.js'

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
      assert.deepStrictEqual(
        createNewValue([1, 2, 3], { type: SELECTION_TYPE.MULTI, paths: [[0]] }, 'structure'),
        ''
      )
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

      assert.deepStrictEqual(
        createNewValue(json, { type: SELECTION_TYPE.MULTI, paths: [[0]] }, 'structure'),
        {
          a: '',
          b: {
            c: ''
          },
          d: []
        }
      )
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
      const state = createState(json)
      const selection = createSelection(json, state, {
        type: SELECTION_TYPE.MULTI,
        anchorPath: ['array', 3],
        focusPath: ['array', 4]
      })
      const path = ['array', 1]
      const operations = moveInsideParent(json, state, selection, path)
      assert.deepStrictEqual(operations, [
        { op: 'move', from: '/array/4', path: '/array/1' },
        { op: 'move', from: '/array/4', path: '/array/1' }
      ])

      const updatedJson = documentStatePatch(json, state, operations).json
      assert.deepStrictEqual(updatedJson, { array: [0, 3, 4, 1, 2, 5] })
    })

    it('should move a selection down inside an array', () => {
      const json = { array: [0, 1, 2, 3, 4, 5] }
      const state = createState(json)
      const selection = createSelection(json, state, {
        type: SELECTION_TYPE.MULTI,
        anchorPath: ['array', 1],
        focusPath: ['array', 2]
      })
      const path = ['array', 4]
      const operations = moveInsideParent(json, state, selection, path)
      assert.deepStrictEqual(operations, [
        { op: 'move', from: '/array/1', path: '/array/4' },
        { op: 'move', from: '/array/1', path: '/array/4' }
      ])

      const updatedJson = documentStatePatch(json, state, operations).json
      assert.deepStrictEqual(updatedJson, { array: [0, 3, 4, 1, 2, 5] })
    })

    it('should move a selection up inside an object', () => {
      const json = { object: { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e' } }
      const state = syncState(json, undefined, [], () => true)
      const selection = createSelection(json, state, {
        type: SELECTION_TYPE.MULTI,
        anchorPath: ['object', 'c'],
        focusPath: ['object', 'd']
      })
      const path = ['object', 'b']
      const operations = moveInsideParent(json, state, selection, path)
      assert.deepStrictEqual(operations, [
        { op: 'move', from: '/object/b', path: '/object/b' },
        { op: 'move', from: '/object/e', path: '/object/e' }
      ])

      const { json: updatedJson, state: updatedState } = documentStatePatch(json, state, operations)
      assert.deepStrictEqual(getKeys(updatedState, ['object']), ['a', 'c', 'd', 'b', 'e'])
      assert.deepStrictEqual(updatedJson, { object: { a: 'a', c: 'c', d: 'd', b: 'b', e: 'e' } })
    })

    it('should move a selection down inside an object', () => {
      const json = { object: { a: 'a', b: 'b', c: 'c', d: 'd', e: 'e' } }
      const state = syncState(json, undefined, [], () => true)
      const selection = createSelection(json, state, {
        type: SELECTION_TYPE.MULTI,
        anchorPath: ['object', 'b'],
        focusPath: ['object', 'c']
      })
      const path = ['object', 'e']
      const operations = moveInsideParent(json, state, selection, path)
      assert.deepStrictEqual(operations, [
        { op: 'move', from: '/object/b', path: '/object/b' },
        { op: 'move', from: '/object/c', path: '/object/c' },
        { op: 'move', from: '/object/e', path: '/object/e' }
      ])

      const { json: updatedJson, state: updatedState } = documentStatePatch(json, state, operations)
      assert.deepStrictEqual(getKeys(updatedState, ['object']), ['a', 'd', 'b', 'c', 'e'])
      assert.deepStrictEqual(updatedJson, { object: { a: 'a', d: 'd', b: 'b', c: 'c', e: 'e' } })
    })

    // TODO: test append, moving to bottom of an array
    // TODO: test append, moving to bottom of an object
    // TODO: test moving up from the bottom of an array
    // TODO: test moving up from the bottom of an object
  })

  // TODO: write tests for all operations
})
