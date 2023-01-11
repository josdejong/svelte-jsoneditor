import { test, describe } from 'vitest'
import { deepStrictEqual, throws } from 'assert'
import { convertToJSON } from './convertToJSON.js'
import { LosslessNumber } from 'lossless-json'

describe('convertToJSON', () => {
  test('convert primitive values', () => {
    deepStrictEqual(convertToJSON(2.3), 2.3)
    deepStrictEqual(convertToJSON('string'), 'string')
    deepStrictEqual(convertToJSON(true), true)
    deepStrictEqual(convertToJSON(false), false)
    deepStrictEqual(convertToJSON(null), null)
  })

  test('convert bigint', () => {
    deepStrictEqual(convertToJSON(123n), 123)
  })

  test('throws an error when it cannot safely convert a bigint', () => {
    throws(
      () => convertToJSON(123456789012345678901234n),
      /Error: Cannot safely convert to number: the value 123456789012345678901234 would truncate and become 1\.2345678901234569e\+23/
    )
  })

  test('convert a LosslessNumber', () => {
    deepStrictEqual(convertToJSON(new LosslessNumber('4.0')), 4)
    deepStrictEqual(
      convertToJSON(new LosslessNumber('0.666666666666666666666666666666')),
      0.6666666666666666
    )
  })

  test('throws an error when it cannot safely convert a LosslessNumber', () => {
    throws(
      () => convertToJSON(new LosslessNumber('123456789012345678901234')),
      /Error: Cannot safely convert to number: the value '123456789012345678901234' would truncate and become 1\.2345678901234569e\+23/
    )
  })

  test('convert Date', () => {
    deepStrictEqual(convertToJSON(new Date('2022-09-12T10:00:00Z')), 1662976800000)
  })

  test('convert an object', () => {
    deepStrictEqual(
      convertToJSON({
        bigint: 123n,
        lossless: new LosslessNumber('4.0')
      }),
      {
        bigint: 123,
        lossless: 4
      }
    )
  })

  test('convert an array', () => {
    deepStrictEqual(convertToJSON([123n, new LosslessNumber('4.0')]), [123, 4])
  })

  test('convert a nested array', () => {
    deepStrictEqual(convertToJSON({ array: [123n, new LosslessNumber('4.0')] }), {
      array: [123, 4]
    })
  })
})
