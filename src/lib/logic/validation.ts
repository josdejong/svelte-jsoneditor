import { initial } from 'lodash-es'
import type { JSONPointerMap, ValidationError } from '../types'
import { compileJSONPointer } from 'immutable-json-patch'

/**
 * Create a flat map with validation errors, where the key is the stringified path
 * and also create error messages for the parent nodes of the nodes having an error.
 *
 * Returns a nested object containing the validation errors
 */
export function mapValidationErrors(
  validationErrors: ValidationError[]
): JSONPointerMap<ValidationError> {
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
