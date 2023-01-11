import { test, describe } from 'vitest'
import { deepStrictEqual, strictEqual } from 'assert'
import {
  createNormalizationFunctions,
  decodeDataPath,
  encodeDataPath,
  jsonEscapeUnicode,
  removeReturnsAndSurroundingWhitespace
} from './domUtils.js'

describe('domUtils', () => {
  test('regex should match whitespace and surrounding whitespace', () => {
    strictEqual(
      removeReturnsAndSurroundingWhitespace(' \n A\nB  \nC  \n  D \n\n E F\n '),
      'ABCDE F'
    )
  })

  test('encode data path', () => {
    strictEqual(
      encodeDataPath(['path', 'to', '2', 'array', 'special\ncharacters\\/']),
      '%2Fpath%2Fto%2F2%2Farray%2Fspecial%0Acharacters%5C~1'
    )
  })

  test('decode data path', () => {
    deepStrictEqual(decodeDataPath('%2Fpath%2Fto%2F2%2Farray%2Fspecial%0Acharacters%5C~1'), [
      'path',
      'to',
      '2',
      'array',
      'special\ncharacters\\/'
    ])
  })

  describe('should escape/unescape text', () => {
    test('escapeControlCharacters=false, escapeUnicodeCharacters=false', () => {
      const { escapeValue, unescapeValue } = createNormalizationFunctions({
        escapeControlCharacters: false,
        escapeUnicodeCharacters: false
      })

      strictEqual(escapeValue('greeting'), 'greeting')
      strictEqual(escapeValue('"'), '"')
      strictEqual(escapeValue('\u0022'), '\u0022') // double quote
      strictEqual(escapeValue('\u000A'), '\u000A') // line feed
      strictEqual(escapeValue('\u0009'), '\u0009') // tab
      strictEqual(escapeValue('\u000D'), '\u000D') // carriage return
      strictEqual(escapeValue('hello\nworld'), 'hello\nworld')
      strictEqual(escapeValue('hello\\nworld'), 'hello\\nworld')
      strictEqual(escapeValue('back\\slash'), 'back\\slash')
      strictEqual(escapeValue('😀'), '😀')
      strictEqual(escapeValue('\ud83d\ude00'), '\ud83d\ude00')

      strictEqual(unescapeValue('greeting'), 'greeting')
      strictEqual(unescapeValue('"'), '"')
      strictEqual(unescapeValue('\u0022'), '\u0022') // double quote
      strictEqual(unescapeValue('\u000A'), '\u000A') // line feed
      strictEqual(unescapeValue('\u0009'), '\u0009') // tab
      strictEqual(unescapeValue('\u000D'), '\u000D') // carriage return
      strictEqual(unescapeValue('hello\nworld'), 'hello\nworld')
      strictEqual(unescapeValue('hello\\nworld'), 'hello\\nworld')
      strictEqual(unescapeValue('back\\slash'), 'back\\slash')
      strictEqual(unescapeValue('😀'), '😀')
      strictEqual(unescapeValue('\ud83d\ude00'), '\ud83d\ude00')
      strictEqual(unescapeValue('\\ud83d\\ude00'), '\\ud83d\\ude00')
    })

    test('escapeControlCharacters=true, escapeUnicodeCharacters=false', () => {
      const { escapeValue, unescapeValue } = createNormalizationFunctions({
        escapeControlCharacters: true,
        escapeUnicodeCharacters: false
      })

      strictEqual(escapeValue('greeting'), 'greeting')
      strictEqual(escapeValue('"'), '\\"')
      strictEqual(escapeValue('\u0022'), '\\"') // double quote
      strictEqual(escapeValue('\u000A'), '\\n') // line feed
      strictEqual(escapeValue('\u0009'), '\\t') // tab
      strictEqual(escapeValue('\u000D'), '\\r') // carriage return
      strictEqual(escapeValue('hello\nworld'), 'hello\\nworld')
      strictEqual(escapeValue('back\\slash'), 'back\\\\slash')
      strictEqual(escapeValue('😀'), '😀')
      strictEqual(escapeValue('\ud83d\ude00'), '\ud83d\ude00')

      strictEqual(unescapeValue('greeting'), 'greeting')
      strictEqual(unescapeValue('\\"'), '"')
      strictEqual(unescapeValue('\\u0022'), '\\u0022') // double quote
      strictEqual(unescapeValue('\\u000A'), '\\u000A') // line feed
      strictEqual(unescapeValue('\\u0009'), '\\u0009') // tab
      strictEqual(unescapeValue('\\u000D'), '\\u000D') // carriage return
      strictEqual(unescapeValue('hello\\nworld'), 'hello\nworld')
      strictEqual(unescapeValue('back\\\\slash'), 'back\\slash')
      strictEqual(unescapeValue('\\ud83d\\ude00'), '\\ud83d\\ude00')
      strictEqual(unescapeValue('\ud83d\ude00'), '\ud83d\ude00')
    })

    test('escapeControlCharacters=false, escapeUnicodeCharacters=true', () => {
      const { escapeValue, unescapeValue } = createNormalizationFunctions({
        escapeControlCharacters: false,
        escapeUnicodeCharacters: true
      })

      strictEqual(escapeValue('greeting'), 'greeting')
      strictEqual(escapeValue('"'), '"')
      strictEqual(escapeValue('\u0022'), '\u0022') // double quote (parsed in JS as ")
      strictEqual(escapeValue('\u000A'), '\u000A') // line feed (parsed in JS as \n)
      strictEqual(escapeValue('\u0009'), '\u0009') // tab (parsed in JS as \t)
      strictEqual(escapeValue('\u000D'), '\u000D') // carriage return (parsed in JS as \r)
      strictEqual(escapeValue('hello\nworld'), 'hello\nworld')
      strictEqual(escapeValue('back\\slash'), 'back\\slash')
      strictEqual(escapeValue('😀'), '\\ud83d\\ude00')
      strictEqual(escapeValue('\ud83d\ude00'), '\\ud83d\\ude00')

      strictEqual(unescapeValue('greeting'), 'greeting')
      strictEqual(unescapeValue('\\"'), '\\"')
      strictEqual(unescapeValue('\u0022'), '\u0022') // double quote
      strictEqual(unescapeValue('\\u0022'), '\\"') // double quote
      strictEqual(unescapeValue('\\u000A'), '\\n') // line feed
      strictEqual(unescapeValue('\\u0009'), '\\t') // tab
      strictEqual(unescapeValue('\\u000D'), '\\r') // carriage return
      strictEqual(unescapeValue('hello\\nworld'), 'hello\\nworld')
      strictEqual(unescapeValue('back\\\\slash'), 'back\\\\slash')
      strictEqual(unescapeValue('\\ud83d\\ude00'), '😀')
      strictEqual(unescapeValue('\ud83d\ude00'), '\ud83d\ude00')
      strictEqual(unescapeValue('\\ud83d\\ude00'), '\ud83d\ude00')
    })

    test('escapeControlCharacters=true, escapeUnicodeCharacters=true', () => {
      const { escapeValue, unescapeValue } = createNormalizationFunctions({
        escapeControlCharacters: true,
        escapeUnicodeCharacters: true
      })

      strictEqual(escapeValue('greeting'), 'greeting')
      strictEqual(escapeValue('"'), '\\"')
      strictEqual(escapeValue('\u0022'), '\\"') // double quote
      strictEqual(escapeValue('\u000A'), '\\n') // line feed
      strictEqual(escapeValue('\u0009'), '\\t') // tab
      strictEqual(escapeValue('\u000D'), '\\r') // carriage return
      strictEqual(escapeValue('hello\nworld'), 'hello\\nworld')
      strictEqual(escapeValue('back\\slash'), 'back\\\\slash')
      strictEqual(escapeValue('😀'), '\\ud83d\\ude00')
      strictEqual(escapeValue('\ud83d\ude00'), '\\ud83d\\ude00')

      strictEqual(unescapeValue('greeting'), 'greeting')
      strictEqual(unescapeValue('\\"'), '"')
      strictEqual(unescapeValue('\\u0022'), '\u0022') // double quote
      strictEqual(unescapeValue('\\u000A'), '\u000A') // line feed
      strictEqual(unescapeValue('\\u0009'), '\u0009') // tab
      strictEqual(unescapeValue('\\u000D'), '\u000D') // carriage return
      strictEqual(unescapeValue('hello\\nworld'), 'hello\nworld')
      strictEqual(unescapeValue('back\\\\slash'), 'back\\slash')
      strictEqual(unescapeValue('\\ud83d\\ude00'), '😀')
      strictEqual(unescapeValue('\ud83d\ude00'), '\ud83d\ude00')
      strictEqual(unescapeValue('\\ud83d\\ude00'), '\ud83d\ude00')
    })
  })

  test('jsonEscapeUnicode', () => {
    strictEqual(jsonEscapeUnicode('\u260e'), '\\u260e')
    strictEqual(jsonEscapeUnicode('\ud83d\ude00'), '\\ud83d\\ude00')
    strictEqual(jsonEscapeUnicode('\b\f\n\r\t'), '\b\f\n\r\t')
  })
})
