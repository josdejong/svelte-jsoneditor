import assert from 'assert'
import { isTimestamp } from './typeUtils.js'

describe('typeUtils', () => {
  // TODO: write unit tests

  it('isTimestamp', () => {
    assert.strictEqual(isTimestamp(1574809200000), true)
    assert.strictEqual(isTimestamp(1574809200000.2), false)
    assert.strictEqual(isTimestamp(123), false)
  })
})
