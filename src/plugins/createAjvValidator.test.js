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
      examples: [
        'John'
      ],
      type: 'string'
    },
    lastName: {
      title: 'Last Name',
      description: 'The family name.',
      examples: [
        'Smith'
      ],
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

const schemaRefs = {
  job: {
    title: 'Job description',
    type: 'object',
    required: ['address'],
    properties: {
      company: {
        type: 'string',
        examples: [
          'ACME',
          'Dexter Industries'
        ]
      },
      role: {
        description: 'Job title.',
        type: 'string',
        examples: [
          'Human Resources Coordinator',
          'Software Developer'
        ],
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
    const validate = createAjvValidator(schema, schemaRefs)

    const invalidDoc = {
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

    assert.deepStrictEqual(validate(invalidDoc), [
      { path: ['gender'], message: 'should be equal to one of: "male", "female"' },
      { path: ['age'], message: 'should be integer' },
      { path: ['job'], message: 'should have required property \'address\'' },
      { path: ['job', 'salary'], message: 'should be >= 120' }
    ])
  })

  // TODO: test support for draft04, draft-06, draft-07
})
