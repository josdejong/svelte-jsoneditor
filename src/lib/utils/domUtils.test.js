import assert from 'assert'
import { escapeHTML, regexReturnAndSurroundingWhitespace, unescapeHTML } from './domUtils.js'

describe('domUtils', () => {
  it('escapeHTML', () => {
    assert.strictEqual(escapeHTML('   hello  '), '&nbsp;&nbsp; hello &nbsp;')
    assert.strictEqual(escapeHTML('&nbsp; hello'), '&amp;nbsp; hello')
    assert.strictEqual(escapeHTML('hello\nworld'), 'hello\\nworld')
    assert.strictEqual(escapeHTML('<script>'), '&lt;script&gt;')

    // TODO: test escapeHTML more thoroughly
  })

  it('unescapeHTML', () => {
    assert.strictEqual(unescapeHTML(' &nbsp; hello &nbsp;'), '   hello  ')
    assert.strictEqual(unescapeHTML('&nbsp; hello'), '  hello')

    assert.strictEqual(unescapeHTML('hello\\nworld'), 'hello\nworld')

    // TODO: test unescapeHTML more thoroughly
  })

  it('regex should match whitespace and surrounding whitespace', () => {
    assert.strictEqual(
      'A\nB  \nC  \n  D \n\n E F'.replace(regexReturnAndSurroundingWhitespace, '*'),
      'A*B*C*D*E F'
    )
  })
})
