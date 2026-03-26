import { strictEqual } from 'node:assert'
import { describe, test } from 'vitest'
import { classnames } from './cssUtils.js'

describe('cssUtils', () => {
  test('classnames', () => {
    strictEqual(classnames(), '')
    strictEqual(classnames('a', 'b'), 'a b')
    strictEqual(classnames('a', { b: true, c: false }), 'a b')
    strictEqual(classnames({ b: true }, { c: true }), 'b c')
  })
})
