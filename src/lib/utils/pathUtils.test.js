import assert from 'assert'
import { stringifyPath } from './pathUtils.js'

describe('pathUtils', () => {
  it('stringifyPath', () => {
    assert.strictEqual(stringifyPath([]), '')
    assert.strictEqual(stringifyPath(['']), '[""]')
    assert.strictEqual(stringifyPath(['foo']), '.foo')
    assert.strictEqual(stringifyPath(['foo', 'bar']), '.foo.bar')
    assert.strictEqual(stringifyPath(['foo', 2]), '.foo[2]')
    assert.strictEqual(stringifyPath(['foo', 2, 'bar']), '.foo[2].bar')
    assert.strictEqual(stringifyPath(['foo', 2, 'bar_baz']), '.foo[2].bar_baz')
    assert.strictEqual(stringifyPath([2]), '[2]')
    assert.strictEqual(stringifyPath(['foo', 'prop-with-hyphens']), '.foo["prop-with-hyphens"]')
    assert.strictEqual(stringifyPath(['foo', 'prop with spaces']), '.foo["prop with spaces"]')
  })
})
