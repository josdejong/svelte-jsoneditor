import assert from 'assert'
import { parsePath, parseString } from './jmespathQueryLanguage.js'

describe('jmespathQueryLanguage', () => {
  describe('jsonPath', () => {
    it('should parse a json path', () => {
      assert.deepStrictEqual(parsePath(''), [])
      assert.deepStrictEqual(parsePath('.foo'), ['foo'])
      assert.deepStrictEqual(parsePath('.foo.bar'), ['foo', 'bar'])
      assert.deepStrictEqual(parsePath('.foo[2]'), ['foo', 2])
      assert.deepStrictEqual(parsePath('.foo[2].bar'), ['foo', 2, 'bar'])
      assert.deepStrictEqual(parsePath('.foo["prop with spaces"]'), ['foo', 'prop with spaces'])
      assert.deepStrictEqual(
        parsePath(".foo['prop with single quotes as outputted by ajv library']"),
        ['foo', 'prop with single quotes as outputted by ajv library']
      )
      assert.deepStrictEqual(parsePath('.foo["prop with . dot"]'), ['foo', 'prop with . dot'])
      assert.deepStrictEqual(parsePath('.foo["prop with ] character"]'), [
        'foo',
        'prop with ] character'
      ])
      assert.deepStrictEqual(parsePath('.foo[*].bar'), ['foo', '*', 'bar'])
      assert.deepStrictEqual(parsePath('[2]'), [2])
    })

    it('should throw an exception in case of an invalid path', () => {
      assert.throws(() => {
        parsePath('.')
      }, /Invalid JSON path: property name expected at index 1/)
      assert.throws(() => {
        parsePath('[')
      }, /Invalid JSON path: unexpected end, character ] expected/)
      assert.throws(() => {
        parsePath('[]')
      }, /Invalid JSON path: array value expected at index 1/)
      assert.throws(() => {
        parsePath('.foo[  ]')
      }, /Invalid JSON path: array value expected at index 7/)
      assert.throws(() => {
        parsePath('.[]')
      }, /Invalid JSON path: property name expected at index 1/)
      assert.throws(() => {
        parsePath('["23]')
      }, /Invalid JSON path: unexpected end, character " expected/)
      assert.throws(() => {
        parsePath('.foo bar')
      }, /Invalid JSON path: unexpected character " " at index 4/)
    })
  })

  it('should parse a string', () => {
    assert.strictEqual(parseString('foo'), 'foo')
    assert.strictEqual(parseString('234foo'), '234foo')
    assert.strictEqual(parseString('  234'), 234)
    assert.strictEqual(parseString('234  '), 234)
    assert.strictEqual(parseString('2.3'), 2.3)
    assert.strictEqual(parseString('null'), null)
    assert.strictEqual(parseString('true'), true)
    assert.strictEqual(parseString('false'), false)
    assert.strictEqual(parseString('+1'), 1)
    assert.strictEqual(parseString(' '), ' ')
    assert.strictEqual(parseString(''), '')
    assert.strictEqual(parseString('"foo"'), '"foo"')
    assert.strictEqual(parseString('"2"'), '"2"')
    assert.strictEqual(parseString("'foo'"), "'foo'")
  })
})
