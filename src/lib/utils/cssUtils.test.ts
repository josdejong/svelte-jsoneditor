import { strictEqual } from 'assert'
import { classnames } from './cssUtils.js'

describe('cssUtils', () => {
  it('classnames', () => {
    strictEqual(classnames(), '')
    strictEqual(classnames('a', 'b'), 'a b')
    strictEqual(classnames('a', { b: true, c: false }), 'a b')
    strictEqual(classnames({ b: true }, { c: true }), 'b c')
  })
})
