import { test, describe, expect } from 'vitest'
import { strictEqual } from 'assert'
import {
  getColorCSS,
  isColor,
  isInteger,
  isObject,
  isObjectOrArray,
  isStringContainingPrimitiveValue,
  isTimestamp,
  stringConvert,
  valueType
} from './typeUtils.js'
import { LosslessNumber, parse, stringify } from 'lossless-json'

const LosslessJSONParser = { parse, stringify }

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

  test('isObject', () => {
    strictEqual(isObject({}), true)
    strictEqual(isObject(Object.create(null)), true)

    strictEqual(isObject(null), false)
    strictEqual(isObject(undefined), false)
    strictEqual(isObject(new Date()), false)
    strictEqual(isObject([]), false)
    strictEqual(isObject(testClass), false)
  })

  test('isObjectOrArray', () => {
    strictEqual(isObjectOrArray({}), true)
    strictEqual(isObjectOrArray(Object.create(null)), true)
    strictEqual(isObjectOrArray([]), true)

    strictEqual(isObjectOrArray(null), false)
    strictEqual(isObjectOrArray(undefined), false)
    strictEqual(isObjectOrArray(new Date()), false)
    strictEqual(isObjectOrArray(testClass), false)
  })

  // TODO: write more unit tests

  test('isTimestamp', () => {
    strictEqual(isTimestamp(1574809200000), true)
    strictEqual(isTimestamp(1574809200000.2), false)
    strictEqual(isTimestamp(123), false)
    strictEqual(isTimestamp(1574809200000n), true)

    class MyNumberType {
      value: string

      constructor(value: string) {
        this.value = value
      }

      valueOf() {
        return parseFloat(this.value)
      }
    }

    strictEqual(isTimestamp(new MyNumberType('1574809200000')), true)
  })

  test('stringConvert', () => {
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

  test('valueType', () => {
    strictEqual(valueType(2, JSON), 'number')
    strictEqual(valueType(-2, JSON), 'number')
    strictEqual(valueType(2.4e3, JSON), 'number')
    strictEqual(valueType('some text', JSON), 'string')
    strictEqual(valueType(true, JSON), 'boolean')
    strictEqual(valueType(false, JSON), 'boolean')
    strictEqual(valueType(null, JSON), 'null')
    strictEqual(valueType([], JSON), 'array')
    strictEqual(valueType({}, JSON), 'object')
    strictEqual(valueType(123n, JSON), 'number')
    strictEqual(valueType(new Date(), JSON), 'unknown')
    strictEqual(valueType(new LosslessNumber('123'), LosslessJSONParser as JSON), 'number')
    strictEqual(valueType(new LosslessNumber('2.4e3'), LosslessJSONParser as JSON), 'number')
    strictEqual(valueType(new LosslessNumber('-4.0'), LosslessJSONParser as JSON), 'number')
  })

  test('isStringContainingPrimitiveValue', () => {
    strictEqual(isStringContainingPrimitiveValue(22), false)
    strictEqual(isStringContainingPrimitiveValue('text'), false)
    strictEqual(isStringContainingPrimitiveValue('2.4'), true)
    strictEqual(isStringContainingPrimitiveValue('-2.4'), true)
    strictEqual(isStringContainingPrimitiveValue('2e3'), true)
    strictEqual(isStringContainingPrimitiveValue('true'), true)
    strictEqual(isStringContainingPrimitiveValue('false'), true)
    strictEqual(isStringContainingPrimitiveValue('null'), true)
  })

  test('isInteger', () => {
    strictEqual(isInteger('4250'), true)
    strictEqual(isInteger('-4250'), true)
    strictEqual(isInteger('2.345'), false)
    strictEqual(isInteger('2a'), false)
    strictEqual(isInteger('abc'), false)
  })

  test('getColorCSS', () => {
    expect(getColorCSS('red')).toBe('red')
    expect(getColorCSS('dodgerblue')).toBe('dodgerblue')
    expect(getColorCSS('#fff')).toBe('rgb(255,255,255)')
    expect(getColorCSS('#82b92c')).toBe('rgb(130,185,44)')
    expect(getColorCSS('rgba(255, 0, 0, 0.5)')).toBe('rgba(255,0,0,0.5)')
    expect(getColorCSS('#ff000066')).toBe('rgba(255,0,0,0.4)')
    expect(getColorCSS('#a')).toBe(undefined)
    expect(getColorCSS('foo')).toBe(undefined)
    expect(getColorCSS('red  ')).toBe(undefined)
    expect(getColorCSS('  ')).toBe(undefined)
  })

  test('isColor', () => {
    expect(isColor('red')).toBe(true)
    expect(isColor('#82b92c')).toBe(true)
    expect(isColor('foo')).toBe(false)
    expect(isColor('')).toBe(false)
  })
})
