import { test, describe } from 'vitest'
import assert from 'assert'
import { compileJSONPointer, parseJSONPointer } from 'immutable-json-patch'

describe('jsonPointer', () => {
  test('parseJSONPointer', () => {
    assert.deepStrictEqual(parseJSONPointer('/obj/a'), ['obj', 'a'])
    assert.deepStrictEqual(parseJSONPointer('/arr/-'), ['arr', '-'])
    assert.deepStrictEqual(parseJSONPointer('/foo/~1~0 ~0~1'), ['foo', '/~ ~/'])
    assert.deepStrictEqual(parseJSONPointer('/obj'), ['obj'])
    assert.deepStrictEqual(parseJSONPointer('/'), [''])
    assert.deepStrictEqual(parseJSONPointer(''), [])
  })

  test('compileJSONPointer', () => {
    assert.deepStrictEqual(compileJSONPointer(['foo', 'bar']), '/foo/bar')
    assert.deepStrictEqual(compileJSONPointer(['foo', '/~ ~/']), '/foo/~1~0 ~0~1')
    assert.deepStrictEqual(compileJSONPointer(['']), '/')
    assert.deepStrictEqual(compileJSONPointer([]), '')
  })
})
