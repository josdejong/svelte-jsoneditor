import { deepStrictEqual } from 'assert'
import { mapValidationErrors } from './validation.js'

describe('validation', () => {
  it('should create a map from a list with validation errors', () => {
    const message1 = 'Number expected'
    const message2 = 'Year in the past expected'
    const message3 = 'Contains invalid data'

    const error1 = { path: ['pupils', '2', 'age'], message: message1 }
    const error2 = { path: ['year'], message: message2 }

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
