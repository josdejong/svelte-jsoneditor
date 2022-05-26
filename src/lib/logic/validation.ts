import { initial } from 'lodash-es'
import { VALIDATION_ERROR } from '../constants.js'
import type { JSONPath } from 'immutable-json-patch'
import { existsIn, setIn } from 'immutable-json-patch'
import type { Path, ValidationError } from '../types'

/**
 * Create a nested map with validation errors,
 * and also create error messages for the parent nodes of the nodes having an error.
 *
 * Returns a nested object containing the validation errors
 */
export function mapValidationErrors(
  validationErrors: ValidationError[]
): Record<string, string> | undefined {
  let object

  validationErrors.forEach((validationError) => {
    const errorPath: Path = validationError.path.concat([VALIDATION_ERROR])
    object = setIn(object, errorPath as JSONPath, validationError, true)
  })

  // create error entries for all parent nodes
  validationErrors.forEach((validationError) => {
    const path = validationError.path
    let parentPath = path

    while (parentPath.length > 0) {
      parentPath = initial(parentPath)

      const parentErrorPath = parentPath.concat([VALIDATION_ERROR])
      if (!existsIn(object, parentErrorPath as JSONPath)) {
        const error = {
          isChildError: true,
          path: parentPath,
          message: 'Contains invalid data'
        }
        object = setIn(object, parentErrorPath as JSONPath, error, true)
      }
    }
  })

  return object
}
