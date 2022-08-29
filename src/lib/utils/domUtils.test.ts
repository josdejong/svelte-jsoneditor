import { deepStrictEqual, strictEqual } from 'assert'
import {
  createNormalizationFunctions,
  decodeDataPath,
  encodeDataPath,
  jsonEscapeUnicode,
  removeReturnsAndSurroundingWhitespace
} from './domUtils.js'

describe('domUtils', () => {
  it('regex should match whitespace and surrounding whitespace', () => {
    strictEqual(
      removeReturnsAndSurroundingWhitespace(' \n A\nB  \nC  \n  D \n\n E F\n '),
      'ABCDE F'
    )
  })

  it('encode data path', () => {
    strictEqual(
      encodeDataPath(['path', 'to', '2', 'array', 'special\ncharacters\\/']),
      '%2Fpath%2Fto%2F2%2Farray%2Fspecial%0Acharacters%5C~1'
    )
  })

  it('decode data path', () => {
    deepStrictEqual(decodeDataPath('%2Fpath%2Fto%2F2%2Farray%2Fspecial%0Acharacters%5C~1'), [
      'path',
      'to',
      '2',
      'array',
      'special\ncharacters\\/'
    ])
  })

  it('encode data path with a number as index', () => {
    strictEqual(encodeDataPath(['array', 2]), '%2Farray%2F2')
  })

  describe('should escape/unescape text', () => {
    it('escapeControlCharacters=false, escapeUnicodeCharacters=false', () => {
      const { escapeValue, unescapeValue } = createNormalizationFunctions({
        escapeControlCharacters: false,
        escapeUnicodeCharacters: false
      })

      strictEqual(escapeValue('greeting'), 'greeting')
      strictEqual(escapeValue('hello\nworld'), 'hello\nworld')
      strictEqual(escapeValue('😀'), '😀')
      strictEqual(escapeValue('\ud83d\ude00'), '\ud83d\ude00')

      strictEqual(unescapeValue('greeting'), 'greeting')
      strictEqual(escapeValue('hello\nworld'), 'hello\nworld')
      strictEqual(escapeValue('hello\\nworld'), 'hello\\nworld')
      strictEqual(unescapeValue('😀'), '😀')
      strictEqual(unescapeValue('\ud83d\ude00'), '\ud83d\ude00')
      strictEqual(unescapeValue('\\ud83d\\ude00'), '\\ud83d\\ude00')
    })

    it('escapeControlCharacters=true, escapeUnicodeCharacters=false', () => {
      const { escapeValue, unescapeValue } = createNormalizationFunctions({
        escapeControlCharacters: true,
        escapeUnicodeCharacters: false
      })

      strictEqual(escapeValue('greeting'), 'greeting')
      strictEqual(escapeValue('hello\nworld'), 'hello\\nworld')
      strictEqual(escapeValue('😀'), '😀')
      strictEqual(escapeValue('\ud83d\ude00'), '\ud83d\ude00')

      strictEqual(unescapeValue('greeting'), 'greeting')
      strictEqual(unescapeValue('hello\\nworld'), 'hello\nworld')
      strictEqual(unescapeValue('\\ud83d\\ude00'), '\\ud83d\\ude00')
      strictEqual(unescapeValue('\ud83d\ude00'), '\ud83d\ude00')
    })

    it('escapeControlCharacters=false, escapeUnicodeCharacters=true', () => {
      const { escapeValue, unescapeValue } = createNormalizationFunctions({
        escapeControlCharacters: false,
        escapeUnicodeCharacters: true
      })

      strictEqual(escapeValue('greeting'), 'greeting')
      strictEqual(escapeValue('hello\nworld'), 'hello\nworld')
      strictEqual(escapeValue('😀'), '\\ud83d\\ude00')
      strictEqual(escapeValue('\ud83d\ude00'), '\\ud83d\\ude00')

      strictEqual(unescapeValue('greeting'), 'greeting')
      strictEqual(unescapeValue('hello\\nworld'), 'hello\\nworld')
      strictEqual(unescapeValue('\\ud83d\\ude00'), '😀')
      strictEqual(unescapeValue('\ud83d\ude00'), '\ud83d\ude00')
      strictEqual(unescapeValue('\\ud83d\\ude00'), '\ud83d\ude00')
    })

    it('escapeControlCharacters=true, escapeUnicodeCharacters=true', () => {
      const { escapeValue, unescapeValue } = createNormalizationFunctions({
        escapeControlCharacters: true,
        escapeUnicodeCharacters: true
      })

      strictEqual(escapeValue('greeting'), 'greeting')
      strictEqual(escapeValue('hello\nworld'), 'hello\\nworld')
      strictEqual(escapeValue('😀'), '\\ud83d\\ude00')
      strictEqual(escapeValue('\ud83d\ude00'), '\\ud83d\\ude00')

      strictEqual(unescapeValue('greeting'), 'greeting')
      strictEqual(unescapeValue('hello\\nworld'), 'hello\nworld')
      strictEqual(unescapeValue('\\ud83d\\ude00'), '😀')
      strictEqual(unescapeValue('\ud83d\ude00'), '\ud83d\ude00')
      strictEqual(unescapeValue('\\ud83d\\ude00'), '\ud83d\ude00')
    })
  })

  it('jsonEscapeUnicode', () => {
    strictEqual(jsonEscapeUnicode('\u260e'), '\\u260e')
    strictEqual(jsonEscapeUnicode('\ud83d\ude00'), '\\ud83d\\ude00')
    strictEqual(jsonEscapeUnicode('\b\f\n\r\t'), '\b\f\n\r\t')
  })
})
