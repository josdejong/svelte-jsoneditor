import { test, describe } from 'vitest'
import assert from 'assert'
import Ajv from 'ajv'
import { createAjvValidator, createAjvValidatorAsync } from './createAjvValidator.js'
import { ValidationSeverity, type JSONSchemaDefinitions } from '$lib/types'

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

const schemaDefinitions: JSONSchemaDefinitions = {
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

describe.each([
  { name: 'createAjvValidator', create: createAjvValidator },
  { name: 'createAjvValidatorAsync', create: createAjvValidatorAsync }
])('$name', ({ create }) => {
  const options = {
    schema,
    schemaDefinitions,
    ajvOptions: {
      loadSchema: () => Promise.resolve({})
    }
  }

  test('should create a validate function', async () => {
    const validate = await create(options)

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

  test('should pass additional Ajv options', async () => {
    const validate = await create({
      ...options,
      ajvOptions: {
        allErrors: false,
        loadSchema: () => Promise.resolve({})
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

  test('should apply additional Ajv configuration to the existing Ajv instance', async () => {
    const validate = await create({
      schema,
      ajvOptions: {
        allErrors: false,
        loadSchema: () => Promise.resolve({})
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

  test('should provide a custom Ajv instance', async () => {
    const validate = await create({
      schema,
      onCreateAjv: () => {
        const myAjv = new Ajv({
          allErrors: false,
          verbose: true,
          $data: true,
          loadSchema: () => Promise.resolve({})
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

  test('should throw an error when providing a wrongly configured Ajv instance', async () => {
    await assert.rejects(
      async () =>
        create({
          schema,
          onCreateAjv: () => new Ajv({ verbose: false })
        }),
      /Ajv must be configured with the option verbose=true/
    )
  })

  test('should throw an error when providing a schema that contains an error', async () => {
    const invalidSchema = { type: 'foo' }

    await assert.rejects(async () => {
      await create({
        schema: invalidSchema,
        ajvOptions: { loadSchema: () => Promise.resolve({}) }
      })
    }, /schema is invalid: data\/type must be equal to one of the allowed values, data\/type must be array, data\/type must match a schema in anyOf/)
  })

  test('should support draft-07', async () => {
    const schemaDraft07 = {
      $schema: 'http://json-schema.org/draft-07/schema#',
      title: 'My test schema',
      type: 'object',
      properties: {
        userId: {
          type: 'number'
        },
        name: {
          type: 'string'
        }
      },
      required: ['userId', 'name']
    }

    const validate = await create({
      schema: schemaDraft07,
      ajvOptions: { loadSchema: () => Promise.resolve({}) }
    })

    const validJson = {
      userId: 1,
      name: 'Luke Skywalker'
    }

    const invalidJson = {
      userId: '1'
    }

    assert.deepStrictEqual(validate(validJson), [])
    assert.deepStrictEqual(validate(invalidJson), [
      { path: [], message: "must have required property 'name'", severity: 'warning' },
      { path: ['userId'], message: 'must be number', severity: 'warning' }
    ])
  })

  // TODO: test support for draft04, draft-06

  test('should use error severity from options', async () => {
    const validate = await create({
      ...options,
      errorSeverity: ValidationSeverity.error
    })

    assert.deepStrictEqual(validate(invalidJson), [
      {
        path: ['gender'],
        message: 'should be equal to one of: "male", "female"',
        severity: 'error'
      },
      { path: ['age'], message: 'must be integer', severity: 'error' },
      { path: ['job'], message: "must have required property 'address'", severity: 'error' },
      { path: ['job', 'salary'], message: 'must be >= 120', severity: 'error' }
    ])
  })

  if (create === createAjvValidatorAsync) {
    test('resolves remote schema using loadSchema', async () => {
      let loadSchemaCalled = false

      const loadSchema = async (uri: string) => {
        assert.strictEqual(uri, '/schema.json')

        loadSchemaCalled = true

        return {
          $id: uri,
          type: 'object',
          properties: {
            age: { type: 'integer' }
          }
        }
      }

      const validate = await createAjvValidatorAsync({
        schema: {
          $ref: '/schema.json'
        },
        ajvOptions: {
          loadSchema
        }
      })

      assert.deepStrictEqual(validate(invalidJson), [
        { path: ['age'], message: 'must be integer', severity: 'warning' }
      ])

      assert.ok(loadSchemaCalled)
    })

    test('rejects if loadSchema returns a rejected promise', async () => {
      const loadSchema = async () => {
        throw new Error('Failed to load schema: Schema not found: /schema.json')
      }

      await assert.rejects(
        async () =>
          createAjvValidatorAsync({
            schema: {
              $ref: '/schema.json'
            },
            ajvOptions: {
              loadSchema
            }
          }),
        /Schema not found: \/schema.json/
      )
    })
  }
})
