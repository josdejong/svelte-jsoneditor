import { strictEqual } from 'assert'
import { removeReturnsAndSurroundingWhitespace, toDataPath } from './domUtils.js'

describe('domUtils', () => {
  it('regex should match whitespace and surrounding whitespace', () => {
    strictEqual(
      removeReturnsAndSurroundingWhitespace(' \n A\nB  \nC  \n  D \n\n E F\n '),
      'ABCDE F'
    )
  })

  it('serialize data path', () => {
    strictEqual('%2Fpath%2Fto%2F2%2Farray', toDataPath(['path', 'to', 2, 'array']))
  })
})
