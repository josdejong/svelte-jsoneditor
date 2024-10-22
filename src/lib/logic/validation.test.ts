import { test, describe } from 'vitest'
import { deepStrictEqual } from 'assert'
import { toRecursiveValidationErrors, validateJSON, validateText } from './validation.js'
import type { ValidationError } from '$lib/types'
import { ValidationSeverity } from '$lib/types.js'
import { stringify, parse, isLosslessNumber } from 'lossless-json'
import { LosslessNumber } from 'lossless-json'

const LosslessJSONParser = { parse, stringify }

describe('validation', () => {
  test('should create a map from a list with validation errors', () => {
    const json = {
      year: 2084,
      pupils: [{ age: 23 }, { age: 26 }, { age: '42' }]
    }

    const severity = ValidationSeverity.warning
    const message1 = 'Number expected'
    const message2 = 'Year in the past expected'
    const message3 = 'Contains invalid data'

    const error1: ValidationError = { path: ['pupils', '2', 'age'], message: message1, severity }
    const error2: ValidationError = { path: ['year'], message: message2, severity }

    const childErrorA = { isChildError: true, path: [], message: message3, severity }
    const childErrorB = { isChildError: true, path: ['pupils'], message: message3, severity }
    const childErrorC = { isChildError: true, path: ['pupils', '2'], message: message3, severity }

    const validationErrors = [error1, error2]

    const items = []
    items[2] = {
      type: 'object',
      validationError: childErrorC,
      properties: {
        age: {
          type: 'value',
          validationError: error1
        }
      }
    }
    deepStrictEqual(toRecursiveValidationErrors(json, validationErrors), {
      type: 'object',
      validationError: childErrorA,
      properties: {
        year: {
          type: 'value',
          validationError: error2
        },
        pupils: {
          type: 'array',
          validationError: childErrorB,
          items
        }
      }
    })
  })

  describe('validateJSON', () => {
    const countValidationError = {
      path: ['count'],
      message: 'Property count must be a positive number',
      severity: ValidationSeverity.warning
    }

    const countLosslessValidationError = {
      path: ['count'],
      message: 'Property count must be a positive LosslessNumber',
      severity: ValidationSeverity.warning
    }

    function myValidator(json: unknown): ValidationError[] {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!json || typeof json.count !== 'number' || json.count <= 0) {
        return [countValidationError]
      }

      return []
    }

    function myLosslessValidator(json: unknown): ValidationError[] {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!json || !isLosslessNumber(json.count) || json.count <= 0) {
        return [countLosslessValidationError]
      }

      return []
    }

    const validJson = { count: 42 }
    const invalidJson = { foo: 42 }
    const validLosslessJson = { count: new LosslessNumber('42') }
    const invalidLosslessJson = { foo: new LosslessNumber('42') }

    test('should validateJSON with native parser and valid JSON', () => {
      deepStrictEqual(validateJSON(validJson, myValidator, JSON, JSON), [])
    })

    test('should validateJSON with native parser and invalid JSON', () => {
      deepStrictEqual(validateJSON(invalidJson, myValidator, JSON, JSON), [countValidationError])
    })

    test('should validateJSON with lossless parser and valid JSON', () => {
      deepStrictEqual(validateJSON(validLosslessJson, myValidator, LosslessJSONParser, JSON), [])
    })

    test('should validateJSON with lossless parser and invalid JSON', () => {
      deepStrictEqual(validateJSON(invalidLosslessJson, myValidator, LosslessJSONParser, JSON), [
        countValidationError
      ])
    })

    test('should validateJSON with two lossless parsers and invalid native JSON', () => {
      deepStrictEqual(
        validateJSON(validJson, myLosslessValidator, LosslessJSONParser, LosslessJSONParser),
        [countLosslessValidationError]
      )
    })

    test('should validateJSON with two lossless parsers and valid lossless JSON', () => {
      deepStrictEqual(
        validateJSON(
          validLosslessJson,
          myLosslessValidator,
          LosslessJSONParser,
          LosslessJSONParser
        ),
        []
      )
    })
  })

  describe('validateText', () => {
    const countValidationError = {
      path: ['count'],
      message: 'Property count must be a positive number',
      severity: ValidationSeverity.warning
    }

    const countLosslessValidationError = {
      path: ['count'],
      message: 'Property count must be a positive LosslessNumber',
      severity: ValidationSeverity.warning
    }

    function myValidator(json: unknown): ValidationError[] {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!json || typeof json.count !== 'number' || json.count <= 0) {
        return [countValidationError]
      }

      return []
    }

    function myLosslessValidator(json: unknown): ValidationError[] {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!json || !isLosslessNumber(json.count) || json.count <= 0) {
        return [countLosslessValidationError]
      }

      return []
    }

    const validText = '{ "count": 42 }'
    const invalidText = '{ "foo": 42 }'

    test('should validateText with native parser and valid JSON', () => {
      deepStrictEqual(validateText(validText, myValidator, JSON, JSON), undefined)
    })

    test('should validateText with native parser and invalid JSON', () => {
      deepStrictEqual(validateText(invalidText, myValidator, JSON, JSON), {
        validationErrors: [countValidationError]
      })
    })

    test('should validateText with lossless parser and valid JSON', () => {
      deepStrictEqual(validateText(validText, myValidator, LosslessJSONParser, JSON), undefined)
    })

    test('should validateText with lossless parser and invalid JSON', () => {
      deepStrictEqual(validateText(invalidText, myValidator, LosslessJSONParser, JSON), {
        validationErrors: [countValidationError]
      })
    })

    test('should validateText with two lossless parsers and valid JSON', () => {
      deepStrictEqual(
        validateText(validText, myLosslessValidator, LosslessJSONParser, LosslessJSONParser),
        undefined
      )
    })

    test('should validateText with two lossless parsers and invalid JSON', () => {
      deepStrictEqual(
        validateText(invalidText, myLosslessValidator, LosslessJSONParser, LosslessJSONParser),
        {
          validationErrors: [countLosslessValidationError]
        }
      )
    })

    test('should validateText with a non-repairable parse error', () => {
      const invalidText = '{\n  "name": "Joe" }[]'

      deepStrictEqual(validateText(invalidText, undefined, LosslessJSONParser, JSON), {
        isRepairable: false,
        parseError: {
          column: 17,
          line: 1,
          message: "Expected end of input but got '[' at line 2 column 18",
          position: 19
        }
      })
    })

    test('should validateText with a repairable parse error', () => {
      const invalidText = '{\n  "name": "Joe"'

      deepStrictEqual(validateText(invalidText, undefined, LosslessJSONParser, JSON), {
        isRepairable: true,
        parseError: {
          column: 15,
          line: 1,
          message:
            "Quoted object key or end of object '}' expected but reached end of input at line 2 column 16",
          position: 17
        }
      })
    })

    test('should validateText with duplicate keys', () => {
      const duplicateKeysText = '{\n  "name": "Joe",\n  "age": 23,\n  "name": "Sarah"\n}'

      deepStrictEqual(validateText(duplicateKeysText, undefined, LosslessJSONParser, JSON), {
        isRepairable: false,
        parseError: {
          column: 3,
          line: 3,
          message: "Duplicate key 'name' encountered at line 4 column 4",
          position: 35
        }
      })
    })
  })
})
