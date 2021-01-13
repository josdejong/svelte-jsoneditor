import assert from 'assert'
import { mapValidationErrors } from './validation.js'
import { VALIDATION_ERROR } from '../constants.js'

describe('validation', () => {
  it('should turn a list with validation errors into a nested object', () => {
    const message1 = 'Number expected'
    const message2 = 'Year in the past expected'
    const message3 = 'Contains invalid data'

    const error1 = { path: ['pupils', 2, 'age'], message: message1 }
    const error2 = { path: ['year'], message: message2 }

    const validationErrorsList = [error1, error2]

    const expected = {
      pupils: [],
      year: {
        [VALIDATION_ERROR]: error2
      }
    }
    expected.pupils[2] = {
      age: {
        [VALIDATION_ERROR]: error1
      }
    }
    expected[VALIDATION_ERROR] = { isChildError: true, path: [], message: message3 }
    expected.pupils[VALIDATION_ERROR] = { isChildError: true, path: ['pupils'], message: message3 }
    expected.pupils[2][VALIDATION_ERROR] = { isChildError: true, path: ['pupils', 2], message: message3 }

    const actual = mapValidationErrors(validationErrorsList)

    assert.deepStrictEqual(actual, expected)
  })

  it('should not override a parent error when creating a validation error object', () => {
    const message1 = 'Year in the past expected'
    const message2 = 'Missing required property "month"'

    const error1 = { path: ['year'], message: message1 }
    const error2 = { path: [], message: message2 }

    const validationErrorsList = [error1, error2]

    const expected = {
      year: {
        [VALIDATION_ERROR]: error1
      },
      [VALIDATION_ERROR]: error2
    }

    const actual = mapValidationErrors(validationErrorsList)

    assert.deepStrictEqual(actual, expected)
  })
})
