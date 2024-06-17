import { test, describe, expect } from 'vitest'
import { deepStrictEqual, strictEqual, deepEqual, throws } from 'assert'
import { LosslessNumber, parse, stringify } from 'lossless-json'
import {
  calculatePosition,
  convertValue,
  countCharacterOccurrences,
  estimateSerializedSize,
  isContent,
  isEqualParser,
  isJSONContent,
  isLargeContent,
  needsFormatting,
  isTextContent,
  normalizeJsonParseError,
  parsePartialJson,
  toJSONContent,
  toTextContent,
  validateContentType,
  parseAndRepairOrUndefined
} from './jsonUtils.js'

const LosslessJSONParser = { parse, stringify }

describe('jsonUtils', () => {
  const jsonString = '{\n' + '  id: 2,\n' + '  name: "Jo"\n' + '}'

  const jsonString2 = '{\n' + '  "id": 2,\n' + '  name: "Jo"\n' + '}'

  test('should normalize an error from Chrome (1)', () => {
    const errorMessage = 'Unexpected token i in JSON at position 4'

    deepStrictEqual(normalizeJsonParseError(jsonString, errorMessage), {
      position: 4,
      line: 1,
      column: 2,
      message: 'Unexpected token i in JSON at line 2 column 3'
    })
  })

  test('should normalize a parse error from Firefox (1)', () => {
    const errorMessage = "expected property name or '}' at line 2 column 3 of the JSON data"

    deepStrictEqual(normalizeJsonParseError(jsonString, errorMessage), {
      position: 4,
      line: 1,
      column: 2,
      message: "expected property name or '}' at line 2 column 3"
    })
  })

  test('should normalize an error from Chrome (2)', () => {
    const errorMessage = 'Unexpected token n in JSON at position 15'

    deepStrictEqual(normalizeJsonParseError(jsonString2, errorMessage), {
      position: 15,
      line: 2,
      column: 2,
      message: 'Unexpected token n in JSON at line 3 column 3'
    })
  })

  test('should normalize a parse error from Firefox (2)', () => {
    const errorMessage = 'expected double-quoted property name at line 3 column 3 of the JSON data'

    deepStrictEqual(normalizeJsonParseError(jsonString2, errorMessage), {
      position: 15,
      line: 2,
      column: 2,
      message: 'expected double-quoted property name at line 3 column 3'
    })
  })

  test('should calculate the position from a line and column number', () => {
    strictEqual(calculatePosition(jsonString, 1, 2), 4)
    strictEqual(calculatePosition(jsonString2, 2, 2), 15)
  })

  test('should count occurrences of a specific character in a string', () => {
    strictEqual(countCharacterOccurrences('1\n2\n3\n4\n', '\n'), 4)
    strictEqual(countCharacterOccurrences('1\n2\n3\n4\n', '\n', 0, 2), 1)
    strictEqual(countCharacterOccurrences('1\n2\n3\n4\n', '\n', 0, 3), 1)
    strictEqual(countCharacterOccurrences('1\n2\n3\n4\n', '\n', 5), 2)
    strictEqual(countCharacterOccurrences('1\n2\n3\n4\n', '\n', 6), 1)
  })

  test('should parse partial JSON', () => {
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

  test('should validate content type', () => {
    deepStrictEqual(validateContentType({ json: [1, 2, 3] }), undefined)
    deepStrictEqual(validateContentType({ text: '[1,2,3]' }), undefined)

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
    test('should estimate the size of a small document (1)', () => {
      const doc = { id: 2, name: 'Suzan' }
      strictEqual(JSON.stringify(doc).length, 23)
      strictEqual(estimateSerializedSize({ json: doc }), 23)
    })

    test('should estimate the size of a small document (2)', () => {
      const doc = [
        { id: 1, name: 'Jo' },
        { id: 2, name: 'Suzan' },
        { id: 3, name: 'Ann' }
      ]
      strictEqual(JSON.stringify(doc).length, 68)
      strictEqual(estimateSerializedSize({ json: doc }), 68)
    })

    test('should estimate the size of a large document', () => {
      const doc = createLargeDoc()
      strictEqual(JSON.stringify(doc).length, 5881)
      strictEqual(estimateSerializedSize({ json: doc }), 5881)
    })

    test('should stop size estimation when exceeding the provided maxSize', () => {
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

  test('isLargeContent', () => {
    const text = '[1,2,3,4,5,6,7,8,9,0]'
    const textContent = { text }
    const jsonContent = { json: JSON.parse(text) }

    strictEqual(isLargeContent(textContent, 100), false)
    strictEqual(isLargeContent(textContent, 10), true)

    strictEqual(isLargeContent(jsonContent, 100), false)
    strictEqual(isLargeContent(jsonContent, 10), true)
  })

  test('isContent', () => {
    strictEqual(isContent({ text: '' }), true)
    strictEqual(isContent({ json: [] }), true)
    strictEqual(isContent({ text: '', json: [] }), true)
    strictEqual(isContent(1), false)
    strictEqual(isContent({}), false)

    const f = () => null
    f.text = '[]'
    strictEqual(isContent(f), false)

    class C {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      text: '[]'
    }
    const c = new C()
    strictEqual(isContent(c), false)
  })

  test('isTextContent', () => {
    strictEqual(isTextContent({ text: '' }), true)
    strictEqual(isTextContent({ json: [] }), false)
    strictEqual(isTextContent({ text: '', json: [] }), true)
    strictEqual(isTextContent(1), false)
    strictEqual(isTextContent({}), false)

    const f = () => null
    f.text = '[]'
    strictEqual(isTextContent(f), false)

    class C {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      text: '[]'
    }
    const c = new C()
    strictEqual(isTextContent(c), false)
  })

  test('isJSONContent', () => {
    strictEqual(isJSONContent({ text: '' }), false)
    strictEqual(isJSONContent({ json: [] }), true)
    strictEqual(isJSONContent({ text: '', json: [] }), true)
    strictEqual(isJSONContent(1), false)
    strictEqual(isJSONContent({}), false)

    const f = () => null
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    f.json = []
    strictEqual(isJSONContent(f), false)

    class C {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      json: []
    }
    const c = new C()
    strictEqual(isJSONContent(c), false)
  })

  test('toTextContent', () => {
    const textContent = { text: '[1,2,3]' }
    strictEqual(toTextContent(textContent), textContent)
    deepStrictEqual(toTextContent({ json: [1, 2, 3] }), textContent)
    deepStrictEqual(toTextContent({ json: [1, 2, 3] }, 2), { text: '[\n  1,\n  2,\n  3\n]' })

    deepStrictEqual(
      toTextContent(
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        { json: [new LosslessNumber('1'), new LosslessNumber('2'), new LosslessNumber('3')] },
        2,
        LosslessJSONParser
      ),
      { text: '[\n  1,\n  2,\n  3\n]' }
    )
  })

  test('toJSONContent', () => {
    const jsonContent = { json: [1, 2, 3] }

    deepStrictEqual(toJSONContent({ text: '[1,2,3]' }), jsonContent)
    strictEqual(toJSONContent(jsonContent), jsonContent)

    deepStrictEqual(toJSONContent({ text: '[1,2,3]' }, LosslessJSONParser), {
      json: [new LosslessNumber('1'), new LosslessNumber('2'), new LosslessNumber('3')]
    })

    throws(() => {
      toJSONContent({ text: '[1,2,3' })
    }, /(SyntaxError: Unexpected end of JSON input)|(SyntaxError: Expected ',' or ']' after array element in JSON at position 6)/)

    throws(() => {
      toJSONContent({ text: '[1,2,3' }, LosslessJSONParser)
    }, /SyntaxError: Array item or end of array ']' expected but reached end of input at position 6/)
  })

  describe('convertValue', () => {
    test('should convert an object to an array', () => {
      deepStrictEqual(convertValue({ 2: 'c', 1: 'b', 0: 'a' }, 'array', JSON), ['a', 'b', 'c'])
    })

    test('should convert an array to an array', () => {
      const array = [1, 2, 3]
      strictEqual(convertValue(array, 'array', JSON), array)
    })

    test('should convert a stringified object to an array', () => {
      deepStrictEqual(convertValue('{ "2": "c", "1": "b", "0": "a" }', 'array', JSON), [
        'a',
        'b',
        'c'
      ])
    })

    test('should convert a stringified array to an array', () => {
      deepStrictEqual(convertValue('[1,2,3]', 'array', JSON), [1, 2, 3])
    })

    test('should return a reasonable array when a value cannot be parsed as JSON', () => {
      const array = ['no valid json text']
      deepEqual(convertValue('no valid json text', 'array', JSON), array)
    })

    test('should return an array with a null value when given invalid JSON value "null"', () => {
      const array = [null]
      deepEqual(convertValue(null, 'array', JSON), array)
    })

    test('should return an array with number value when given invalid JSON as number', () => {
      const array = [1]
      deepEqual(convertValue(1, 'array', JSON), array)
    })

    test('should return an array with boolean value when given invalid JSON as boolean', () => {
      const array = [false]
      deepEqual(convertValue(false, 'array', JSON), array)
    })

    test('should convert an array to an object', () => {
      deepStrictEqual(convertValue(['a', 'b', 'c'], 'object', JSON), { 2: 'c', 1: 'b', 0: 'a' })
    })

    test('should convert an object to an object', () => {
      const object = {
        a: 1,
        b: 2
      }
      strictEqual(convertValue(object, 'object', JSON), object)
    })

    test('should convert a stringified object to an object', () => {
      deepStrictEqual(convertValue('{"a":1,"b":2}', 'object', JSON), { a: 1, b: 2 })
    })

    test('should convert a stringified array to an object', () => {
      deepStrictEqual(convertValue('["a", "b", "c"]', 'object', JSON), { 2: 'c', 1: 'b', 0: 'a' })
    })

    test('should return a reasonable object when a value cannot be parsed as JSON, putting the value in a "value" key', () => {
      const object = {
        value: 'no valid json text'
      }
      deepEqual(convertValue('no valid json text', 'object', JSON), object)
    })

    test('should return a reasonable object with a null value under "value" when given invalid JSON value "null"', () => {
      const object = {
        value: null
      }
      deepEqual(convertValue(null, 'object', JSON), object)
    })

    test('should return a reasonable object with a number value under "value" when given invalid JSON of number', () => {
      const object = {
        value: 1
      }
      deepEqual(convertValue(1, 'object', JSON), object)
    })

    test('should return a reasonable object with a boolean value under "value" when given invalid JSON value of boolean', () => {
      const object = {
        value: false
      }
      deepEqual(convertValue(false, 'object', JSON), object)
    })

    test('should convert an array to a value', () => {
      deepStrictEqual(convertValue([1, 2, 3], 'value', JSON), '[1,2,3]')
    })

    test('should convert an object to a value', () => {
      deepStrictEqual(convertValue({ a: 1, b: 2 }, 'value', JSON), '{"a":1,"b":2}')
    })

    test('should convert a value to a value', () => {
      strictEqual(convertValue('foo', 'value', JSON), 'foo')
      strictEqual(convertValue(true, 'value', JSON), true)
    })

    test('should test whether two parsers are equal', () => {
      const LosslessJSON = { parse, stringify }
      const LosslessJSON2 = { parse, stringify }

      strictEqual(isEqualParser(JSON, JSON), true)
      strictEqual(isEqualParser(LosslessJSON, LosslessJSON), true)
      strictEqual(isEqualParser(LosslessJSON, LosslessJSON2), true)
      strictEqual(isEqualParser(LosslessJSON, JSON), false)
    })
  })

  describe('needsFormatting', () => {
    test('should check whether a JSON string can use formatting', () => {
      expect(needsFormatting('[1,2,3]')).toBe(true)
      expect(needsFormatting('{"a":1,"b":2}')).toBe(true)

      expect(needsFormatting('[]')).toBe(false)
      expect(needsFormatting('{}')).toBe(false)

      expect(needsFormatting('')).toBe(false)
      expect(needsFormatting('[\n1,\n  2,\n  3\n]')).toBe(false)
      expect(needsFormatting('{\n  "a": true,\n  "b": false\n}')).toBe(false)

      expect(needsFormatting('1234')).toBe(false)
      expect(needsFormatting('"abc"')).toBe(false)
      expect(needsFormatting('true')).toBe(false)
      expect(needsFormatting('false')).toBe(false)
      expect(needsFormatting('null')).toBe(false)

      expect(needsFormatting('[1, 2, 3]')).toBe(false)
      expect(needsFormatting('{"a": 1, "b": 2}')).toBe(false)
      expect(needsFormatting('{"a":1, "b":2}')).toBe(true)
      expect(needsFormatting('{\n  "a": "some:message"\n}')).toBe(false)
      expect(needsFormatting('{\n  "a": "some,message"\n}')).toBe(false)

      expect(needsFormatting('\n[1,2,3]')).toBe(true)
      expect(needsFormatting('[1,2,3]\n')).toBe(true)
      expect(needsFormatting('[1,2,3]\n  ')).toBe(true)
      expect(needsFormatting('  \n[1,2,3]')).toBe(true)

      // a colon or comma inside a string gives a false positive (when the text doesn't contain a return character)
      expect(needsFormatting('{"a": "some:message"}')).toBe(true)
      expect(needsFormatting('{"a": "some,message"}')).toBe(true)
    })
  })

  describe('parseAndRepairOrUndefined', () => {
    test('repair partial JSON', () => {
      expect(parseAndRepairOrUndefined('[1,2', JSON)).toEqual([1, 2])
      expect(parseAndRepairOrUndefined('[1,2][]', JSON)).toEqual(undefined)
      expect(parseAndRepairOrUndefined('hello world', JSON)).toEqual('hello world')
      // expect(parseAndRepairOrUndefined('0123', JSON)).toEqual('0123') // FIXME
    })
  })
})
