import assert from 'assert'
import { stringifyPath } from './pathUtils.js'

describe('pathUtils', () => {
  it('stringifyPath', () => {
    assert.strictEqual(stringifyPath(['data', 2, 'nested', 'property']), '.data[2].nested.property')
    assert.strictEqual(stringifyPath(['']), '.')
    assert.strictEqual(stringifyPath([]), '')
  })
})
