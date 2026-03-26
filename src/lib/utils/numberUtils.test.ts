import { strictEqual } from 'node:assert'
import { describe, test } from 'vitest'
import { isDigit } from './numberUtils.js'

describe('numberUtils', () => {
  test('isDigit', () => {
    strictEqual(isDigit('0'), true)
    strictEqual(isDigit('5'), true)
    strictEqual(isDigit('9'), true)
    strictEqual(isDigit('a'), false)
    strictEqual(isDigit('111'), false)
    strictEqual(isDigit(''), false)
  })
})
