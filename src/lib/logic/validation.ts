import { initial } from 'lodash-es'
import type {
  ContentErrors,
  JSONPointerMap,
  NestedValidationError,
  ValidationError,
  Validator
} from '../types.js'
import { ValidationSeverity } from '../types.js'
import { compileJSONPointer, type JSONValue } from 'immutable-json-patch'
import { MAX_AUTO_REPAIRABLE_SIZE, MAX_VALIDATABLE_SIZE } from '../constants.js'
import { measure } from '../utils/timeUtils.js'
import { normalizeJsonParseError } from '../utils/jsonUtils.js'
import { createDebug } from '../utils/debug.js'
import jsonrepair from 'jsonrepair'

const debug = createDebug('validation')

/**
 * Create a flat map with validation errors, where the key is the stringified path
 * and also create error messages for the parent nodes of the nodes having an error.
 *
 * Returns a nested object containing the validation errors
 */
export function mapValidationErrors(
  validationErrors: ValidationError[]
): JSONPointerMap<NestedValidationError> {
  const map = {}

  // first generate a map with the errors themselves
  validationErrors.forEach((validationError) => {
    map[compileJSONPointer(validationError.path)] = validationError
  })

  // create error entries for all parent nodes (displayed when the node is collapsed)
  validationErrors.forEach((validationError) => {
    let parentPath = validationError.path

    while (parentPath.length > 0) {
      parentPath = initial(parentPath)
      const parentPointer = compileJSONPointer(parentPath)

      if (!(parentPointer in map)) {
        map[parentPointer] = {
          isChildError: true,
          path: parentPath,
          message: 'Contains invalid data'
        }
      }
    }
  })

  return map
}

export function validateJSON(json: JSONValue, validator: Validator): ValidationError[] {
  debug('validateJSON')
  return validator(json)
}

export function validateText(text: string, validator: Validator, parser: JSON): ContentErrors {
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
    return {
      validationErrors: []
    }
  }

  try {
    const json = measure(
      () => parser.parse(text),
      (duration) => debug(`validate: parsed json in ${duration} ms`)
    )

    if (!validator) {
      return {
        validationErrors: []
      }
    }

    const validationErrors = measure(
      () => validator(json),
      (duration) => debug(`validate: validated json in ${duration} ms`)
    )

    return { validationErrors }
  } catch (err) {
    const isRepairable = measure(
      () => canAutoRepair(text, parser),
      (duration) => debug(`validate: checked whether repairable in ${duration} ms`)
    )

    const parseError = normalizeJsonParseError(text, err.message || err.toString())

    return {
      parseError,
      isRepairable
    }
  }
}

function canAutoRepair(text: string, parser: JSON): boolean {
  if (text.length > MAX_AUTO_REPAIRABLE_SIZE) {
    return false
  }

  try {
    parser.parse(jsonrepair(text))

    return true
  } catch (err) {
    return false
  }
}
