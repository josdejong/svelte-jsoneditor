import type { JSONParser } from '$lib/types.js'
import { deepStrictEqual, strictEqual, deepEqual } from 'assert'
import { parse, stringify } from 'lossless-json'
import {
  calculatePosition,
  convertValue,
  countCharacterOccurrences,
  estimateSerializedSize,
  isEqualParser,
  isLargeContent,
  isTextContent,
  normalizeJsonParseError,
  parsePartialJson,
  validateContentType
} from './jsonUtils.js'

describe('jsonUtils', () => {
  const jsonString = '{\n' + '  id: 2,\n' + '  name: "Jo"\n' + '}'

  const jsonString2 = '{\n' + '  "id": 2,\n' + '  name: "Jo"\n' + '}'

  it('should normalize an error from Chrome (1)', () => {
    const errorMessage = 'Unexpected token i in JSON at position 4'

    deepStrictEqual(normalizeJsonParseError(jsonString, errorMessage), {
      position: 4,
      line: 1,
      column: 2,
      message: 'Unexpected token i in JSON at line 2 column 3'
    })
  })

  it('should normalize a parse error from Firefox (1)', () => {
    const errorMessage = "expected property name or '}' at line 2 column 3 of the JSON data"

    deepStrictEqual(normalizeJsonParseError(jsonString, errorMessage), {
      position: 4,
      line: 1,
      column: 2,
      message: "expected property name or '}' at line 2 column 3"
    })
  })

  it('should normalize an error from Chrome (2)', () => {
    const errorMessage = 'Unexpected token n in JSON at position 15'

    deepStrictEqual(normalizeJsonParseError(jsonString2, errorMessage), {
      position: 15,
      line: 2,
      column: 2,
      message: 'Unexpected token n in JSON at line 3 column 3'
    })
  })

  it('should normalize a parse error from Firefox (2)', () => {
    const errorMessage = 'expected double-quoted property name at line 3 column 3 of the JSON data'

    deepStrictEqual(normalizeJsonParseError(jsonString2, errorMessage), {
      position: 15,
      line: 2,
      column: 2,
      message: 'expected double-quoted property name at line 3 column 3'
    })
  })

  it('should calculate the position from a line and column number', () => {
    strictEqual(calculatePosition(jsonString, 1, 2), 4)
    strictEqual(calculatePosition(jsonString2, 2, 2), 15)
  })

  it('should count occurrences of a specific character in a string', () => {
    strictEqual(countCharacterOccurrences('1\n2\n3\n4\n', '\n'), 4)
    strictEqual(countCharacterOccurrences('1\n2\n3\n4\n', '\n', 0, 2), 1)
    strictEqual(countCharacterOccurrences('1\n2\n3\n4\n', '\n', 0, 3), 1)
    strictEqual(countCharacterOccurrences('1\n2\n3\n4\n', '\n', 5), 2)
    strictEqual(countCharacterOccurrences('1\n2\n3\n4\n', '\n', 6), 1)
  })

  it('should parse partial JSON', () => {
    deepStrictEqual(parsePartialJson('"hello world"', JSON.parse), 'hello world')
    deepStrictEqual(parsePartialJson('null', JSON.parse), null)
    deepStrictEqual(parsePartialJson('42', JSON.parse), 42)

    // parse partial array
    deepStrictEqual(parsePartialJson('1,2', JSON.parse), [1, 2])
    deepStrictEqual(parsePartialJson('1,2,', JSON.parse), [1, 2])

    // parse partial object
    const partialJson = '"str": "hello world",\n' + '"nill": null,\n' + '"bool": false'
    const expected = {
      str: 'hello world',
      nill: null,
      bool: false
    }
    deepStrictEqual(parsePartialJson(partialJson, JSON.parse), expected)
    deepStrictEqual(parsePartialJson(partialJson + ',', JSON.parse), expected)
  })

  it('should validate content type', () => {
    deepStrictEqual(validateContentType({ json: [1, 2, 3] }), null)
    deepStrictEqual(validateContentType({ text: '[1,2,3]' }), null)

    deepStrictEqual(
      validateContentType({ text: [1, 2, 3] }),
      'Content "text" property must be a string containing a JSON document. Did you mean to use the "json" property instead?'
    )

    deepStrictEqual(
      validateContentType({ json: [1, 2, 3], text: '[1,2,3]' }),
      'Content must contain either a property "json" or a property "text" but not both'
    )

    deepStrictEqual(
      validateContentType({}),
      'Content must contain either a property "json" or a property "text"'
    )

    deepStrictEqual(validateContentType([]), 'Content must be an object')
    deepStrictEqual(validateContentType(2), 'Content must be an object')
  })

  describe('estimateSerializedSize', () => {
    it('should estimate the size of a small document (1)', () => {
      const doc = { id: 2, name: 'Suzan' }
      strictEqual(JSON.stringify(doc).length, 23)
      strictEqual(estimateSerializedSize({ json: doc }), 23)
    })

    it('should estimate the size of a small document (2)', () => {
      const doc = [
        { id: 1, name: 'Jo' },
        { id: 2, name: 'Suzan' },
        { id: 3, name: 'Ann' }
      ]
      strictEqual(JSON.stringify(doc).length, 68)
      strictEqual(estimateSerializedSize({ json: doc }), 68)
    })

    it('should estimate the size of a large document', () => {
      const doc = createLargeDoc()
      strictEqual(JSON.stringify(doc).length, 5881)
      strictEqual(estimateSerializedSize({ json: doc }), 5881)
    })

    it('should stop size estimation when exceeding the provided maxSize', () => {
      const doc = createLargeDoc()

      strictEqual(estimateSerializedSize({ json: doc }, 1000), 1004)
    })

    function createLargeDoc() {
      const doc = []

      for (let i = 0; i < 100; i++) {
        doc.push({
          id: i,
          name: 'Item ' + i,
          stuff: [true, false, null, 123.2]
        })
      }

      return doc
    }
  })

  describe('isLargeContent', () => {
    const text = '[1,2,3,4,5,6,7,8,9,0]'
    const textContent = { text }
    const jsonContent = { json: JSON.parse(text) }

    strictEqual(isLargeContent(textContent, 100), false)
    strictEqual(isLargeContent(textContent, 10), true)

    strictEqual(isLargeContent(jsonContent, 100), false)
    strictEqual(isLargeContent(jsonContent, 10), true)
  })

  describe('isTextContent', () => {
    strictEqual(isTextContent({ text: '' }), true)
    strictEqual(isTextContent({ json: [] }), false)
    strictEqual(isTextContent({ text: '', json: [] }), true)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    strictEqual(isTextContent(1), false)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    strictEqual(isTextContent({}), false)
  })

  describe('convertValue', () => {
    it('should convert an object to an array', () => {
      deepStrictEqual(convertValue({ 2: 'c', 1: 'b', 0: 'a' }, 'array', JSON), ['a', 'b', 'c'])
    })

    it('should convert an array to an array', () => {
      const array = [1, 2, 3]
      strictEqual(convertValue(array, 'array', JSON), array)
    })

    it('should convert a stringified object to an array', () => {
      deepStrictEqual(convertValue('{ "2": "c", "1": "b", "0": "a" }', 'array', JSON), [
        'a',
        'b',
        'c'
      ])
    })

    it('should convert a stringified array to an array', () => {
      deepStrictEqual(convertValue('[1,2,3]', 'array', JSON), [1, 2, 3])
    })

    it('should return a reasonable array when a value cannot be parsed as JSON', () => {
      const array = ['no valid json text']
      deepEqual(convertValue('no valid json text', 'array', JSON), array)
    })

    it('should return an array with a null value when given invalid JSON value "null"', () => {
      const array = [null]
      deepEqual(convertValue(null, 'array', JSON), array)
    })

    it('should return an array with undefined value when given invalid JSON value "undefined"', () => {
      const array = [undefined]
      deepEqual(convertValue(undefined, 'array', JSON), array)
    })

    it('should return an array with number value when given invalid JSON as number', () => {
      const array = [1]
      deepEqual(convertValue(1, 'array', JSON), array)
    })

    it('should return an array with boolean value when given invalid JSON as boolean', () => {
      const array = [false]
      deepEqual(convertValue(false, 'array', JSON), array)
    })

    it('should convert an array to an object', () => {
      deepStrictEqual(convertValue(['a', 'b', 'c'], 'object', JSON), { 2: 'c', 1: 'b', 0: 'a' })
    })

    it('should convert an object to an object', () => {
      const object = {
        a: 1,
        b: 2
      }
      strictEqual(convertValue(object, 'object', JSON), object)
    })

    it('should convert a stringified object to an object', () => {
      deepStrictEqual(convertValue('{"a":1,"b":2}', 'object', JSON), { a: 1, b: 2 })
    })

    it('should convert a stringified array to an object', () => {
      deepStrictEqual(convertValue('["a", "b", "c"]', 'object', JSON), { 2: 'c', 1: 'b', 0: 'a' })
    })

    it('should return a reasonable object when a value cannot be parsed as JSON, putting the value in a "value" key', () => {
      const object = {
        value: 'no valid json text'
      }
      deepEqual(convertValue('no valid json text', 'object', JSON), object)
    })

    it('should return a reasonable object with a null value under "value" when given invalid JSON value "null"', () => {
      const object = {
        value: null
      }
      deepEqual(convertValue(null, 'object', JSON), object)
    })

    it('should return a reasonable object with a undefined value under "value" when given invalid JSON value "undefined"', () => {
      const object = {
        value: undefined
      }
      deepEqual(convertValue(undefined, 'object', JSON), object)
    })

    it('should return a reasonable object with a number value under "value" when given invalid JSON of number', () => {
      const object = {
        value: 1
      }
      deepEqual(convertValue(1, 'object', JSON), object)
    })

    it('should return a reasonable object with a boolean value under "value" when given invalid JSON value of boolean', () => {
      const object = {
        value: false
      }
      deepEqual(convertValue(false, 'object', JSON), object)
    })

    it('should convert an array to a value', () => {
      deepStrictEqual(convertValue([1, 2, 3], 'value', JSON), '[1,2,3]')
    })

    it('should convert an object to a value', () => {
      deepStrictEqual(convertValue({ a: 1, b: 2 }, 'value', JSON), '{"a":1,"b":2}')
    })

    it('should convert a value to a value', () => {
      strictEqual(convertValue('foo', 'value', JSON), 'foo')
      strictEqual(convertValue(true, 'value', JSON), true)
    })

    it('should test whether two parsers are equal', () => {
      // FIXME: should not be needed to cast to JSONParser
      const LosslessJSON = { parse, stringify } as JSONParser
      const LosslessJSON2 = { parse, stringify } as JSONParser

      strictEqual(isEqualParser(JSON, JSON), true)
      strictEqual(isEqualParser(LosslessJSON, LosslessJSON), true)
      strictEqual(isEqualParser(LosslessJSON, LosslessJSON2), true)
      strictEqual(isEqualParser(LosslessJSON, JSON), false)
    })
  })
})
