import { deepStrictEqual } from 'assert'
import { mapValidationErrors } from './validation.js'
import type { ValidationError } from '../types'
import { ValidationSeverity } from '../types.js'

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
})
