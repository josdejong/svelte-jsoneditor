import { deepStrictEqual } from 'assert'
import { mapValidationErrors, validateJSON, validateText } from './validation.js'
import type { JSONParser, ValidationError } from '../types'
import { ValidationSeverity } from '../types.js'
import { stringify, type JSONValue, parse, isLosslessNumber } from 'lossless-json'
import { LosslessNumber } from 'lossless-json'

const LosslessJSONParser = { parse, stringify } as JSONParser

describe('validation', () => {
  it('should create a map from a list with validation errors', () => {
    const message1 = 'Number expected'
    const message2 = 'Year in the past expected'
    const message3 = 'Contains invalid data'

    const error1: ValidationError = {
      path: ['pupils', '2', 'age'],
      message: message1,
      severity: ValidationSeverity.warning
    }
    const error2: ValidationError = {
      path: ['year'],
      message: message2,
      severity: ValidationSeverity.warning
    }

    const validationErrors = [error1, error2]

    deepStrictEqual(mapValidationErrors(validationErrors), {
      '': {
        isChildError: true,
        path: [],
        message: message3
      },
      '/pupils': {
        isChildError: true,
        path: ['pupils'],
        message: message3
      },
      '/pupils/2': {
        isChildError: true,
        path: ['pupils', '2'],
        message: message3
      },
      '/pupils/2/age': error1,
      '/year': error2
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

    function myValidator(json: JSONValue): ValidationError[] {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!json || typeof json.count !== 'number' || json.count <= 0) {
        return [countValidationError]
      }

      return []
    }

    function myLosslessValidator(json: JSONValue): ValidationError[] {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!json || !isLosslessNumber(json.count) || json.count <= 0) {
        return [countLosslessValidationError]
      }

      return []
    }

    const validJson = { count: 42 } as JSONValue
    const invalidJson = { foo: 42 } as JSONValue
    const validLosslessJson = { count: new LosslessNumber('42') } as unknown as JSONValue
    const invalidLosslessJson = { foo: new LosslessNumber('42') } as unknown as JSONValue

    it('should validateJSON with native parser and valid JSON', () => {
      deepStrictEqual(validateJSON(validJson, myValidator, JSON, JSON), [])
    })

    it('should validateJSON with native parser and invalid JSON', () => {
      deepStrictEqual(validateJSON(invalidJson, myValidator, JSON, JSON), [countValidationError])
    })

    it('should validateJSON with lossless parser and valid JSON', () => {
      deepStrictEqual(validateJSON(validLosslessJson, myValidator, LosslessJSONParser, JSON), [])
    })

    it('should validateJSON with lossless parser and invalid JSON', () => {
      deepStrictEqual(validateJSON(invalidLosslessJson, myValidator, LosslessJSONParser, JSON), [
        countValidationError
      ])
    })

    it('should validateJSON with two lossless parsers and invalid native JSON', () => {
      deepStrictEqual(
        validateJSON(validJson, myLosslessValidator, LosslessJSONParser, LosslessJSONParser),
        [countLosslessValidationError]
      )
    })

    it('should validateJSON with two lossless parsers and valid lossless JSON', () => {
      deepStrictEqual(
        validateJSON(
          validLosslessJson as unknown as JSONValue,
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

    function myValidator(json: JSONValue): ValidationError[] {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!json || typeof json.count !== 'number' || json.count <= 0) {
        return [countValidationError]
      }

      return []
    }

    function myLosslessValidator(json: JSONValue): ValidationError[] {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      if (!json || !isLosslessNumber(json.count) || json.count <= 0) {
        return [countLosslessValidationError]
      }

      return []
    }

    const validText = '{ "count": 42 }'
    const invalidText = '{ "foo": 42 }'

    it('should validateText with native parser and valid JSON', () => {
      deepStrictEqual(validateText(validText, myValidator, JSON, JSON), {
        validationErrors: []
      })
    })

    it('should validateText with native parser and invalid JSON', () => {
      deepStrictEqual(validateText(invalidText, myValidator, JSON, JSON), {
        validationErrors: [countValidationError]
      })
    })

    it('should validateText with lossless parser and valid JSON', () => {
      deepStrictEqual(validateText(validText, myValidator, LosslessJSONParser, JSON), {
        validationErrors: []
      })
    })

    it('should validateText with lossless parser and invalid JSON', () => {
      deepStrictEqual(validateText(invalidText, myValidator, LosslessJSONParser, JSON), {
        validationErrors: [countValidationError]
      })
    })

    it('should validateText with two lossless parsers and valid JSON', () => {
      deepStrictEqual(
        validateText(validText, myLosslessValidator, LosslessJSONParser, LosslessJSONParser),
        {
          validationErrors: []
        }
      )
    })

    it('should validateText with two lossless parsers and invalid JSON', () => {
      deepStrictEqual(
        validateText(invalidText, myLosslessValidator, LosslessJSONParser, LosslessJSONParser),
        {
          validationErrors: [countLosslessValidationError]
        }
      )
    })

    it('should validateText with a non-repairable parse error', () => {
      const invalidText = '{\n  "name": "Joe" ]'

      deepStrictEqual(validateText(invalidText, null, LosslessJSONParser, JSON), {
        isRepairable: false,
        parseError: {
          column: 16,
          line: 1,
          message: "Comma ',' expected after value but got ']' at line 2 column 17",
          position: 18
        }
      })
    })

    it('should validateText with a repairable parse error', () => {
      const invalidText = '{\n  "name": "Joe"'

      deepStrictEqual(validateText(invalidText, null, LosslessJSONParser, JSON), {
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

    it('should validateText with duplicate keys', () => {
      const duplicateKeysText = '{\n  "name": "Joe",\n  "age": 23,\n  "name": "Sarah"\n}'

      deepStrictEqual(validateText(duplicateKeysText, null, LosslessJSONParser, JSON), {
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
