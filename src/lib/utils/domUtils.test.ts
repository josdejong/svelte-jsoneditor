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
      encodeDataPath(['path', 'to', 2, 'array', 'special\ncharacters']),
      '%5B%22path%22%2C%22to%22%2C2%2C%22array%22%2C%22special%5Cncharacters%22%5D'
    )
  })

  it('decode data path', () => {
    deepStrictEqual(
      decodeDataPath('%5B%22path%22%2C%22to%22%2C2%2C%22array%22%2C%22special%5Cncharacters%22%5D'),
      ['path', 'to', 2, 'array', 'special\ncharacters']
    )
  })

  describe('should escape/unescape text', () => {
    it('escapeControlCharacters=false, escapeUnicodeCharacters=false', () => {
      const { escapeValue, unescapeValue } = createNormalizationFunctions({
        escapeControlCharacters: false,
        escapeUnicodeCharacters: false
      })

      strictEqual('greeting', escapeValue('greeting'))
      strictEqual('hello\nworld', escapeValue('hello\nworld'))
      strictEqual('😀', escapeValue('😀'))
      strictEqual('\ud83d\ude00', escapeValue('\ud83d\ude00'))

      strictEqual('greeting', unescapeValue('greeting'))
      strictEqual('hello\nworld', escapeValue('hello\nworld'))
      strictEqual('hello\\nworld', escapeValue('hello\\nworld'))
      strictEqual('😀', unescapeValue('😀'))
      strictEqual('\ud83d\ude00', unescapeValue('\ud83d\ude00'))
      strictEqual('\\ud83d\\ude00', unescapeValue('\\ud83d\\ude00'))
    })

    it('escapeControlCharacters=true, escapeUnicodeCharacters=false', () => {
      const { escapeValue, unescapeValue } = createNormalizationFunctions({
        escapeControlCharacters: true,
        escapeUnicodeCharacters: false
      })

      strictEqual('greeting', escapeValue('greeting'))
      strictEqual('hello\\nworld', escapeValue('hello\nworld'))
      strictEqual('😀', escapeValue('😀'))
      strictEqual('\ud83d\ude00', escapeValue('\ud83d\ude00'))

      strictEqual('greeting', unescapeValue('greeting'))
      strictEqual('hello\nworld', unescapeValue('hello\\nworld'))
      strictEqual('\\ud83d\\ude00', unescapeValue('\\ud83d\\ude00'))
      strictEqual('\ud83d\ude00', unescapeValue('\ud83d\ude00'))
    })

    it('escapeControlCharacters=false, escapeUnicodeCharacters=true', () => {
      const { escapeValue, unescapeValue } = createNormalizationFunctions({
        escapeControlCharacters: false,
        escapeUnicodeCharacters: true
      })

      strictEqual('greeting', escapeValue('greeting'))
      strictEqual('hello\nworld', escapeValue('hello\nworld'))
      strictEqual('\\ud83d\\ude00', escapeValue('😀'))
      strictEqual('\\ud83d\\ude00', escapeValue('\ud83d\ude00'))

      strictEqual('greeting', unescapeValue('greeting'))
      strictEqual('hello\\nworld', unescapeValue('hello\\nworld'))
      strictEqual('😀', unescapeValue('\\ud83d\\ude00'))
      strictEqual('\ud83d\ude00', unescapeValue('\ud83d\ude00'))
      strictEqual('\ud83d\ude00', unescapeValue('\\ud83d\\ude00'))
    })

    it('escapeControlCharacters=true, escapeUnicodeCharacters=true', () => {
      const { escapeValue, unescapeValue } = createNormalizationFunctions({
        escapeControlCharacters: true,
        escapeUnicodeCharacters: true
      })

      strictEqual('greeting', escapeValue('greeting'))
      strictEqual('hello\\nworld', escapeValue('hello\nworld'))
      strictEqual('\\ud83d\\ude00', escapeValue('😀'))
      strictEqual('\\ud83d\\ude00', escapeValue('\ud83d\ude00'))

      strictEqual('greeting', unescapeValue('greeting'))
      strictEqual('hello\nworld', unescapeValue('hello\\nworld'))
      strictEqual('😀', unescapeValue('\\ud83d\\ude00'))
      strictEqual('\ud83d\ude00', unescapeValue('\ud83d\ude00'))
      strictEqual('\ud83d\ude00', unescapeValue('\\ud83d\\ude00'))
    })
  })

  it('jsonEscapeUnicode', () => {
    strictEqual('\\u260e', jsonEscapeUnicode('\u260e'))
    strictEqual('\\ud83d\\ude00', jsonEscapeUnicode('\ud83d\ude00'))
    strictEqual('\b\f\n\r\t', jsonEscapeUnicode('\b\f\n\r\t'))
  })
})
