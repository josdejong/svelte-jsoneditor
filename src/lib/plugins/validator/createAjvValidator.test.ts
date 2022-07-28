import assert from 'assert'
import { createAjvValidator } from './createAjvValidator.js'

const schema = {
  title: 'Employee',
  description: 'Object containing employee details',
  type: 'object',
  properties: {
    firstName: {
      title: 'First Name',
      description: 'The given name.',
      examples: ['John'],
      type: 'string'
    },
    lastName: {
      title: 'Last Name',
      description: 'The family name.',
      examples: ['Smith'],
      type: 'string'
    },
    gender: {
      title: 'Gender',
      enum: ['male', 'female']
    },
    availableToHire: {
      type: 'boolean',
      default: false
    },
    age: {
      description: 'Age in years',
      type: 'integer',
      minimum: 0,
      examples: [28, 32]
    },
    job: {
      $ref: 'job'
    }
  },
  required: ['firstName', 'lastName']
}

const schemaDefinitions = {
  job: {
    title: 'Job description',
    type: 'object',
    required: ['address'],
    properties: {
      company: {
        type: 'string',
        examples: ['ACME', 'Dexter Industries']
      },
      role: {
        description: 'Job title.',
        type: 'string',
        examples: ['Human Resources Coordinator', 'Software Developer'],
        default: 'Software Developer'
      },
      address: {
        type: 'string'
      },
      salary: {
        type: 'number',
        minimum: 120,
        examples: [100, 110, 120]
      }
    }
  }
}

describe('createAjvValidator', () => {
  it('should create a validate function', () => {
    const validate = createAjvValidator(schema, schemaDefinitions)

    const invalidJson = {
      firstName: 'John',
      lastName: 'Doe',
      gender: null,
      age: '28',
      availableToHire: true,
      job: {
        company: 'freelance',
        role: 'developer',
        salary: 100
      }
    }

    assert.deepStrictEqual(validate(invalidJson), [
      {
        path: ['gender'],
        message: 'should be equal to one of: "male", "female"',
        severity: 'warning'
      },
      { path: ['age'], message: 'must be integer', severity: 'warning' },
      { path: ['job'], message: "must have required property 'address'", severity: 'warning' },
      { path: ['job', 'salary'], message: 'must be >= 120', severity: 'warning' }
    ])
  })

  // TODO: test support for draft04, draft-06, draft-07
})
