// TODO: officially expose the json pointer functions in immutable-json-patch
import { parseJSONPointer } from 'immutable-json-patch/lib/esm/jsonPointer.js'
import { getIn } from './immutabilityHelpers.js'

export * from 'immutable-json-patch/lib/esm/jsonPointer.js'

/**
 * Parse a JSONPointer, and turn array indices into numeric values.
 * For example, '/array/2/name' returns ['array', 2, 'name'] when array turns
 * out to be an actual Array
 *
 * @param {JSON} json
 * @param {string} path
 */
// TODO: unit test
export function parseJSONPointerWithArrayIndices (json, path) {
  const parsedPath = parseJSONPointer(path)

  // parse Array indexes into a number
  for (let i = 0; i < parsedPath.length; i++) {
    const section = parsedPath[i]

    if (ARRAY_INDEX_REGEX.exec(section)) {
      // this path part contains a number.
      // See if the document actually contains an array
      const parentPath = parsedPath.slice(0, i)
      const parent = getIn(json, parentPath)

      if (Array.isArray(parent)) {
        parsedPath[i] = parseInt(section)
      }
    }
  }

  return parsedPath
}

// test whether a string only contains one or digits, like "1" or "204"
const ARRAY_INDEX_REGEX = /^\d+$/
