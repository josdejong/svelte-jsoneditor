import { strictEqual } from 'assert'
import {
  isObject,
  isObjectOrArray,
  isStringContainingPrimitiveValue,
  isTimestamp,
  stringConvert
} from './typeUtils.js'

describe('typeUtils', () => {
  class TestClass {
    constructor(x: number, y: number) {
      this.x = x
      this.y = y
    }
    x: number
    y: number
  }

  const testClass = new TestClass(2, 3)

  it('isObject', () => {
    strictEqual(isObject({}), true)

    strictEqual(isObject(null), false)
    strictEqual(isObject(undefined), false)
    strictEqual(isObject(new Date()), false)
    strictEqual(isObject([]), false)
    strictEqual(isObject(testClass), false)
  })

  it('isObjectOrArray', () => {
    strictEqual(isObjectOrArray({}), true)
    strictEqual(isObjectOrArray([]), true)

    strictEqual(isObjectOrArray(null), false)
    strictEqual(isObjectOrArray(undefined), false)
    strictEqual(isObjectOrArray(new Date()), false)
    strictEqual(isObjectOrArray(testClass), false)
  })

  // TODO: write more unit tests

  it('isTimestamp', () => {
    strictEqual(isTimestamp(1574809200000), true)
    strictEqual(isTimestamp(1574809200000.2), false)
    strictEqual(isTimestamp(123), false)
  })

  it('stringConvert', () => {
    strictEqual(stringConvert('text', JSON), 'text')
    strictEqual(stringConvert('2.4', JSON), 2.4)
    strictEqual(stringConvert('-2.4', JSON), -2.4)
    strictEqual(stringConvert('0.4', JSON), 0.4)
    strictEqual(stringConvert('2e3', JSON), 2e3)
    strictEqual(stringConvert('true', JSON), true)
    strictEqual(stringConvert(' true', JSON), true)
    strictEqual(stringConvert('false', JSON), false)
    strictEqual(stringConvert('false ', JSON), false)
    strictEqual(stringConvert('null', JSON), null)
    strictEqual(stringConvert(' null', JSON), null)
    strictEqual(stringConvert(' 2.4', JSON), 2.4)
    strictEqual(stringConvert('2.4 ', JSON), 2.4)
    strictEqual(stringConvert('123ab', JSON), '123ab')
    strictEqual(stringConvert('  ', JSON), '  ')
  })

  it('isStringContainingPrimitiveValue', () => {
    strictEqual(isStringContainingPrimitiveValue(22, JSON), false)
    strictEqual(isStringContainingPrimitiveValue('text', JSON), false)
    strictEqual(isStringContainingPrimitiveValue('2.4', JSON), true)
    strictEqual(isStringContainingPrimitiveValue('2e3', JSON), true)
    strictEqual(isStringContainingPrimitiveValue('true', JSON), true)
    strictEqual(isStringContainingPrimitiveValue('false', JSON), true)
    strictEqual(isStringContainingPrimitiveValue('null', JSON), true)
  })
})
