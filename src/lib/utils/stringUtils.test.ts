import { test, describe } from 'vitest'
import assert from 'assert'
import {
  compareStrings,
  duplicateInText,
  findUniqueName,
  parseString,
  toCapital,
  truncate
} from './stringUtils.js'

describe('stringUtils', () => {
  test('findUniqueName', () => {
    assert.deepStrictEqual(findUniqueName('other', ['a', 'b', 'c']), 'other')
    assert.deepStrictEqual(findUniqueName('b', ['a', 'b', 'c']), 'b (copy)')
    assert.deepStrictEqual(findUniqueName('b', ['a', 'b', 'c', 'b (copy)']), 'b (copy 2)')
    assert.deepStrictEqual(findUniqueName('b (copy)', ['a', 'b', 'c', 'b (copy)']), 'b (copy 2)')
    assert.deepStrictEqual(
      findUniqueName('b', ['a', 'b', 'c', 'b (copy)', 'b (copy 2)']),
      'b (copy 3)'
    )
    assert.deepStrictEqual(
      findUniqueName('b (copy)', ['a', 'b', 'c', 'b (copy)', 'b (copy 2)']),
      'b (copy 3)'
    )
    assert.deepStrictEqual(
      findUniqueName('b (copy 2)', ['a', 'b', 'c', 'b (copy)', 'b (copy 2)']),
      'b (copy 3)'
    )
  })

  test('toCapital', () => {
    assert.deepStrictEqual(toCapital('hello'), 'Hello')
    assert.deepStrictEqual(toCapital('HEllo'), 'Hello')
    assert.deepStrictEqual(toCapital('HEllo'), 'Hello')
    assert.deepStrictEqual(toCapital(''), '')
  })

  test('compareStrings', () => {
    assert.deepStrictEqual(compareStrings('a', 'b'), -1)
    assert.deepStrictEqual(compareStrings('b', 'a'), 1)
    assert.deepStrictEqual(compareStrings('a', 'a'), 0)

    const array = ['b', 'c', 'a']
    assert.deepStrictEqual(array.sort(compareStrings), ['a', 'b', 'c'])
  })

  test('duplicateInText', () => {
    assert.deepStrictEqual(duplicateInText('abcdef', 2, 4), 'abcdcdef')
    assert.deepStrictEqual(duplicateInText('abcdef', 4, 2), 'abcdcdef')
  })

  test('should truncate long text', () => {
    const text = 'Hello world'

    assert.deepStrictEqual(truncate(text, 100), text)
    assert.deepStrictEqual(truncate(text, 11), text)
    assert.deepStrictEqual(truncate(text, 10), 'Hello w...')
    assert.deepStrictEqual(truncate(text, 8), 'Hello...')
  })

  test('should parse a string', () => {
    assert.strictEqual(parseString('foo'), 'foo')
    assert.strictEqual(parseString('234foo'), '234foo')
    assert.strictEqual(parseString('  234'), 234)
    assert.strictEqual(parseString('234  '), 234)
    assert.strictEqual(parseString('2.3'), 2.3)
    assert.strictEqual(parseString('null'), null)
    assert.strictEqual(parseString('true'), true)
    assert.strictEqual(parseString('false'), false)
    assert.strictEqual(parseString('undefined'), undefined)
    assert.strictEqual(parseString('+1'), 1)
    assert.strictEqual(parseString(' '), ' ')
    assert.strictEqual(parseString(''), '')
    assert.strictEqual(parseString('"foo"'), '"foo"')
    assert.strictEqual(parseString('"2"'), '"2"')
    assert.strictEqual(parseString("'foo'"), "'foo'")
  })
})
