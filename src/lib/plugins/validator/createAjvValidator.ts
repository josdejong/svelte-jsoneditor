import type Ajv from 'ajv'
import type { Options, Schema, ErrorObject, ValidateFunction, AsyncSchema } from 'ajv'
import AjvDist from 'ajv'
import { parsePath } from 'immutable-json-patch'
import type { JSONSchema, JSONSchemaDefinitions, ValidationError, Validator } from '$lib/types'
import { ValidationSeverity } from '$lib/types.js'

export interface AjvValidatorOptions {
  /**
   * The JSON schema to validate (required).
   */
  schema: JSONSchema

  /**
   * An object containing JSON Schema definitions which can be referenced using $ref.
   */
  schemaDefinitions?: JSONSchemaDefinitions

  /**
   * Optional extra options for Ajv.
   */
  ajvOptions?: Options

  /**
   * An optional callback function allowing to apply additional configuration on the provided Ajv instance, or return
   * your own Ajv instance and ignore the provided one.
   */
  onCreateAjv?: (ajv: Ajv) => Ajv | void

  /**
   * The severity of the validation error.
   *
   * @default ValidationSeverity.warning
   */
  errorSeverity?: ValidationSeverity
}

/**
 * Create a JSON Schema validator powered by Ajv.
 */
export function createAjvValidator(options: AjvValidatorOptions): Validator {
  const ajv = createAjvInstance(options)

  const validateAjv = ajv.compile(options.schema as Schema)

  return createValidateFunction(validateAjv, options)
}

/**
 * Create a JSON Schema validator powered by Ajv.
 *
 * Same as `createAjvValidator`, but allows for remote schema resolution through `ajvOptions`'s `loadSchema(uri)`
 * function.
 *
 * Note that `ajvOptions.loadSchema` *must* be set, or Ajv throws an error on initialization!
 *
 * ### Example
 *
 *     const validate = await createAjvValidatorAsync({
 *       schema: {
 *         $ref: '/schema.json'
 *       },
 *       ajvOptions: {
 *         loadSchema(uri) {
 *           return fetch(uri).then((res) => res.json())
 *         }
 *       }
 *     })
 */
export async function createAjvValidatorAsync(options: AjvValidatorOptions): Promise<Validator> {
  const ajv = createAjvInstance(options)

  const validateAjv = await ajv.compileAsync(options.schema as AsyncSchema)

  return createValidateFunction(validateAjv, options)
}

function createAjvInstance(options: AjvValidatorOptions): Ajv {
  const { schemaDefinitions, ajvOptions } = options

  let ajv = new AjvDist({
    allErrors: true,
    verbose: true,
    $data: true,
    ...ajvOptions
  })

  if (schemaDefinitions) {
    Object.keys(schemaDefinitions).forEach((ref) => {
      ajv.addSchema(schemaDefinitions[ref] as Schema, ref)
    })
  }

  ajv = options.onCreateAjv?.(ajv) ?? ajv

  // validate whether ajv is configured correctly (this is needed to enhance error messages)
  if (ajv.opts.verbose === false) {
    throw new Error('Ajv must be configured with the option verbose=true')
  }

  return ajv
}

function createValidateFunction(
  ajvValidator: ValidateFunction<unknown>,
  options: AjvValidatorOptions
): Validator {
  if (ajvValidator.errors) {
    throw ajvValidator.errors[0]
  }

  return function validate(json: unknown): ValidationError[] {
    ajvValidator(json)
    const ajvErrors = ajvValidator.errors ?? []

    return ajvErrors.map(improveAjvError).map((error) => normalizeAjvError(json, error, options))
  }
}

function normalizeAjvError(
  json: unknown,
  ajvError: ErrorObject,
  options: AjvValidatorOptions
): ValidationError {
  return {
    path: parsePath(json, ajvError.instancePath),
    message: ajvError.message ?? 'Unknown error',
    severity: options.errorSeverity ?? ValidationSeverity.warning
  }
}

/**
 * Improve the error message of a JSON schema error,
 * for example list the available values of an enum.
 */
function improveAjvError(ajvError: ErrorObject): ErrorObject {
  let message: string | undefined = undefined

  if (ajvError.keyword === 'enum' && Array.isArray(ajvError.schema)) {
    let enums = ajvError.schema
    if (enums) {
      enums = enums.map((value) => JSON.stringify(value))

      if (enums.length > 5) {
        const more = ['(' + (enums.length - 5) + ' more...)']
        enums = enums.slice(0, 5)
        enums.push(more)
      }
      message = 'should be equal to one of: ' + enums.join(', ')
    }
  }

  if (ajvError.keyword === 'additionalProperties') {
    message = 'should NOT have additional property: ' + ajvError.params.additionalProperty
  }

  return message ? { ...ajvError, message } : ajvError
}
