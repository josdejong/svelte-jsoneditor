import { deepStrictEqual, strictEqual } from 'assert'
import {
  calculatePosition,
  countCharacterOccurrences,
  parsePartialJson,
  normalizeJsonParseError,
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
      message: errorMessage
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
      message: errorMessage
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
    deepStrictEqual(parsePartialJson('"hello world"'), 'hello world')
    deepStrictEqual(parsePartialJson('null'), null)
    deepStrictEqual(parsePartialJson('42'), 42)

    // parse partial array
    deepStrictEqual(parsePartialJson('1,2'), [1, 2])
    deepStrictEqual(parsePartialJson('1,2,'), [1, 2])

    // parse partial object
    const partialJson = '"str": "hello world",\n' + '"nill": null,\n' + '"bool": false'
    const expected = {
      str: 'hello world',
      nill: null,
      bool: false
    }
    deepStrictEqual(parsePartialJson(partialJson), expected)
    deepStrictEqual(parsePartialJson(partialJson + ','), expected)
  })

  it('should validate content type', () => {
    deepStrictEqual(validateContentType({ json: [1, 2, 3] }), null)
    deepStrictEqual(validateContentType({ text: '[1,2,3]' }), null)

    deepStrictEqual(
      validateContentType({ text: [1, 2, 3] }),
      'Content "text" property must be string'
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
})
