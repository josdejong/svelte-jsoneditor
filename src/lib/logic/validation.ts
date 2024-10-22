import { initial, isEmpty } from 'lodash-es'
import type {
  ContentErrors,
  JSONParser,
  RecursiveStateFactory,
  ValidationErrors,
  ValidationError,
  Validator
} from '$lib/types.js'
import { ValidationSeverity } from '$lib/types.js'
import { MAX_AUTO_REPAIRABLE_SIZE, MAX_VALIDATABLE_SIZE } from '../constants.js'
import { measure } from '../utils/timeUtils.js'
import { normalizeJsonParseError } from '../utils/jsonUtils.js'
import { createDebug } from '../utils/debug.js'
import { jsonrepair } from 'jsonrepair'
import { updateInRecursiveState } from './documentState.js'
import type { JSONPath } from 'immutable-json-patch'

const debug = createDebug('validation')

export const validationErrorsFactory: RecursiveStateFactory = {
  createObjectDocumentState: () => ({ type: 'object', properties: {} }),
  createArrayDocumentState: () => ({ type: 'array', items: [] }),
  createValueDocumentState: () => ({ type: 'value' })
}

export function updateInValidationErrors(
  json: unknown,
  errors: ValidationErrors | undefined,
  path: JSONPath,
  transform: (value: unknown, state: ValidationErrors) => ValidationErrors
): ValidationErrors {
  return updateInRecursiveState(json, errors, path, transform, validationErrorsFactory)
}

/**
 * Create a flat map with validation errors, where the key is the stringified path
 * and also create error messages for the parent nodes of the nodes having an error.
 *
 * Returns a nested object containing the validation errors
 */
export function toRecursiveValidationErrors(
  json: unknown,
  validationErrors: ValidationError[]
): ValidationErrors | undefined {
  let output: ValidationErrors | undefined

  // first generate the errors themselves
  validationErrors.forEach((validationError) => {
    output = updateInValidationErrors(json, output, validationError.path, (_, state) => ({
      ...state,
      validationError
    }))
  })

  // create error entries for all parent nodes (displayed when the node is collapsed)
  validationErrors.forEach((validationError) => {
    let parentPath = validationError.path

    while (parentPath.length > 0) {
      parentPath = initial(parentPath)

      output = updateInValidationErrors(json, output, parentPath, (_, state) => {
        return state.validationError
          ? state
          : {
              ...state,
              validationError: {
                isChildError: true,
                path: parentPath,
                message: 'Contains invalid data',
                severity: ValidationSeverity.warning
              }
            }
      })
    }
  })

  return output
}

export function validateJSON(
  json: unknown,
  validator: Validator | undefined,
  parser: JSONParser,
  validationParser: JSONParser
): ValidationError[] {
  debug('validateJSON')

  if (!validator) {
    return []
  }

  if (parser !== validationParser) {
    // if needed, convert for example Lossless JSON to native JSON
    // (like replace bigint or LosslessNumber into regular numbers)
    const text = parser.stringify(json)
    const convertedJSON = text !== undefined ? validationParser.parse(text) : undefined
    return validator(convertedJSON)
  } else {
    return validator(json)
  }
}

export function validateText(
  text: string,
  validator: Validator | undefined,
  parser: JSONParser,
  validationParser: JSONParser
): ContentErrors | undefined {
  debug('validateText')

  if (text.length > MAX_VALIDATABLE_SIZE) {
    const validationError: ValidationError = {
      path: [],
      message: 'Validation turned off: the document is too large',
      severity: ValidationSeverity.info
    }

    return {
      validationErrors: [validationError]
    }
  }

  if (text.length === 0) {
    // new, empty document, do not try to parse
    return undefined
  }

  try {
    // parse with the "main" parser (not the validation parser) to get parse errors
    // (like syntax errors and duplicate keys errors)
    const json = measure(
      () => parser.parse(text),
      (duration) => debug(`validate: parsed json in ${duration} ms`)
    )

    if (!validator) {
      return undefined
    }

    // if needed, parse with the validationParser to be able to feed the json to the validator
    const convertedJSON =
      parser === validationParser
        ? json
        : measure(
            () => validationParser.parse(text),
            (duration) => debug(`validate: parsed json with the validationParser in ${duration} ms`)
          )

    // actually validate the json
    const validationErrors = measure(
      () => validator(convertedJSON),
      (duration) => debug(`validate: validated json in ${duration} ms`)
    )

    return !isEmpty(validationErrors) ? { validationErrors } : undefined
  } catch (err) {
    const isRepairable = measure(
      () => canAutoRepair(text, parser),
      (duration) => debug(`validate: checked whether repairable in ${duration} ms`)
    )

    const parseError = normalizeJsonParseError(
      text,
      (err as Error).message || (err as Error).toString()
    )

    return {
      parseError,
      isRepairable
    }
  }
}

function canAutoRepair(text: string, parser: JSONParser): boolean {
  if (text.length > MAX_AUTO_REPAIRABLE_SIZE) {
    return false
  }

  try {
    parser.parse(jsonrepair(text))

    return true
  } catch {
    return false
  }
}
