import assert from 'assert'
import Ajv from 'ajv-dist'
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

describe('createAjvValidator', () => {
  it('should create a validate function', () => {
    const validate = createAjvValidator({ schema, schemaDefinitions })

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

  it('should pass additional Ajv options', () => {
    const validate = createAjvValidator({
      schema,
      schemaDefinitions,
      ajvOptions: {
        allErrors: false
      }
    })

    assert.deepStrictEqual(validate(invalidJson), [
      {
        path: ['gender'],
        message: 'should be equal to one of: "male", "female"',
        severity: 'warning'
      }
    ])
  })

  it('should apply additional Ajv configuration to the existing Ajv instance', () => {
    const validate = createAjvValidator({
      schema,
      ajvOptions: {
        allErrors: false
      },
      onCreateAjv: (ajv) => {
        Object.keys(schemaDefinitions).forEach((ref) => {
          ajv.addSchema(schemaDefinitions[ref], ref)
        })
      }
    })

    assert.deepStrictEqual(validate(invalidJson), [
      {
        path: ['gender'],
        message: 'should be equal to one of: "male", "female"',
        severity: 'warning'
      }
    ])
  })

  it('should provide a custom Ajv instance', () => {
    const validate = createAjvValidator({
      schema,
      onCreateAjv: () => {
        const myAjv = new Ajv({
          allErrors: false,
          verbose: true,
          $data: true
        })

        Object.keys(schemaDefinitions).forEach((ref) => {
          myAjv.addSchema(schemaDefinitions[ref], ref)
        })

        return myAjv
      }
    })

    assert.deepStrictEqual(validate(invalidJson), [
      {
        path: ['gender'],
        message: 'should be equal to one of: "male", "female"',
        severity: 'warning'
      }
    ])
  })

  it('should throw an error when using the deprecated API', () => {
    // Deprecation error for the API of v0.9.2 and older
    assert.throws(() => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      createAjvValidator(schema, schemaDefinitions, {
        allErrors: false
      })
    }, /the signature of createAjvValidator is changed/)
  })

  // TODO: test support for draft04, draft-06, draft-07
})
