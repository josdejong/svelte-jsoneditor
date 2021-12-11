import assert from 'assert'
import { removeReturnsAndSurroundingWhitespace } from './domUtils.js'

describe('domUtils', () => {
  it('regex should match whitespace and surrounding whitespace', () => {
    assert.strictEqual(
      removeReturnsAndSurroundingWhitespace(' \n A\nB  \nC  \n  D \n\n E F\n '),
      'ABCDE F'
    )
  })
})
