import { initial } from 'lodash-es'
import { VALIDATION_ERROR } from '../constants.ts'
import { existsIn, setIn } from 'immutable-json-patch'

/**
 * Create a nested map with validation errors,
 * and also create error messages for the parent nodes of the nodes having an error.
 *
 * @param {ValidationError[]} validationErrors
 * @return {Object.<string, string> | undefined} Returns a nested object containing
 */
export function mapValidationErrors(validationErrors) {
  let object

  validationErrors.forEach((validationError) => {
    const errorPath = validationError.path.concat([VALIDATION_ERROR])
    object = setIn(object, errorPath, validationError, true)
  })

  // create error entries for all parent nodes
  validationErrors.forEach((validationError) => {
    const path = validationError.path
    let parentPath = path

    while (parentPath.length > 0) {
      parentPath = initial(parentPath)

      const parentErrorPath = parentPath.concat([VALIDATION_ERROR])
      if (!existsIn(object, parentErrorPath)) {
        const error = {
          isChildError: true,
          path: parentPath,
          message: 'Contains invalid data'
        }
        object = setIn(object, parentErrorPath, error, true)
      }
    }
  })

  return object
}
