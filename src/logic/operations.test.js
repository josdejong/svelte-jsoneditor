import assert from 'assert'
import { clipboardToValues, createNewValue } from './operations.js'
import { SELECTION_TYPE } from './selection.js'

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
      assert.deepStrictEqual(createNewValue([1, 2, 3], { type: SELECTION_TYPE.MULTI, paths: [[0]] }, 'structure'), '')
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

      assert.deepStrictEqual(createNewValue(json, { type: SELECTION_TYPE.MULTI, paths: [[0]] }, 'structure'), {
        a: '',
        b: {
          c: ''
        },
        d: []
      })
    })
  })

  it('should turn clipboard text into an array with key/value pairs', () => {
    assert.deepStrictEqual(clipboardToValues('42'), [
      { key: 'New item', value: 42 }
    ])

    assert.deepStrictEqual(clipboardToValues('Hello world'), [
      { key: 'New item', value: 'Hello world' }
    ])

    assert.deepStrictEqual(clipboardToValues('"Hello world"'), [
      { key: 'New item', value: 'Hello world' }
    ])

    assert.deepStrictEqual(clipboardToValues('[1,2,3]'), [
      { key: 'New item', value: [1, 2, 3] }
    ])

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

  // TODO: write tests for all operations
})
