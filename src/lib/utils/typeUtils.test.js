import assert from 'assert'
import { isStringContainingPrimitiveValue, isTimestamp, stringConvert } from './typeUtils.js'

describe('typeUtils', () => {
  // TODO: write unit tests

  it('isTimestamp', () => {
    assert.strictEqual(isTimestamp(1574809200000), true)
    assert.strictEqual(isTimestamp(1574809200000.2), false)
    assert.strictEqual(isTimestamp(123), false)
  })

  it('stringConvert', () => {
    assert.strictEqual(stringConvert('text'), 'text')
    assert.strictEqual(stringConvert('2.4'), 2.4)
    assert.strictEqual(stringConvert('-2.4'), -2.4)
    assert.strictEqual(stringConvert('.4'), 0.4)
    assert.strictEqual(stringConvert('2e3'), 2e3)
    assert.strictEqual(stringConvert('true'), true)
    assert.strictEqual(stringConvert('false'), false)
    assert.strictEqual(stringConvert('null'), null)
    assert.strictEqual(stringConvert(' null'), ' null')
    assert.strictEqual(stringConvert(' 2.4'), 2.4)
    assert.strictEqual(stringConvert('2.4 '), 2.4)
    assert.strictEqual(stringConvert('123ab'), '123ab')
    assert.strictEqual(stringConvert('  '), '  ')
  })

  it('isStringContainingPrimitiveValue', () => {
    assert.strictEqual(isStringContainingPrimitiveValue(22), false)
    assert.strictEqual(isStringContainingPrimitiveValue('text'), false)
    assert.strictEqual(isStringContainingPrimitiveValue('2.4'), true)
    assert.strictEqual(isStringContainingPrimitiveValue('2e3'), true)
    assert.strictEqual(isStringContainingPrimitiveValue('true'), true)
    assert.strictEqual(isStringContainingPrimitiveValue('false'), true)
    assert.strictEqual(isStringContainingPrimitiveValue('null'), true)
  })
})
