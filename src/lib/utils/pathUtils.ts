import { isEmpty, memoize } from 'lodash-es'
import type { JSONPath } from 'immutable-json-patch'

/**
 * Stringify a path like:
 *
 *     ["data", "2", "nested property", "name"]
 *
 * into a JSON path string like:
 *
 *     "$.data[2]['nested property'].name"
 */
export function stringifyJSONPath(path: JSONPath): string {
  return '$' + path.map(stringifyJSONPathProp).join('')
}

/**
 * Stringify a single property of a JSON path. See also stringifyJSONPath
 */
export function stringifyJSONPathProp(prop: string): string {
  if (integerNumberRegex.test(prop)) {
    return '[' + prop + ']'
  } else if (javaScriptPropertyRegex.test(prop)) {
    return '.' + prop
  } else {
    const propStr = JSON.stringify(prop)
    // remove enclosing double quotes, and unescape escaped double qoutes \"
    const jsonPathStr = propStr.substring(1, propStr.length - 1).replace(/\\"/g, '"')
    return "['" + jsonPathStr + "']"
  }
}

/**
 * Strip the leading '$' and '.' from a JSONPath, for example:
 *
 *   "$.data[2].nested.property"
 *
 * will be changed into:
 *
 *   "data[2].nested.property"
 *
 * See also prependRootObject
 */
export function stripRootObject(path: string): string {
  return path
    .replace(/^\$/, '') // remove any leading $ character
    .replace(/^\./, '') // remove any leading dot
}

/**
 * Add $ and . at the start of a JSON path when missing
 * This is the opposite of stripRootObject
 */
export function prependRootObject(path: string): string {
  if (path.startsWith('$')) {
    return path
  }

  return !path.startsWith('[') && !path.startsWith('.') ? '$.' + path : '$' + path
}

/**
 * Parse a string into a JSONPath. For example the input:
 *
 *   "$.data[2]['nested property'].name"
 *
 * will return:
 *
 *   ["data", "2", "nested property", "name"]
 *
 */
export function parseJSONPath(path: string): JSONPath {
  let remainder = prependRootObject(path.trim()).substring(1) // strip the leading $

  const jsonPath: JSONPath = []

  while (remainder.length > 0) {
    const match = remainder.match(regexJsonPathProp)

    if (!match) {
      throw new SyntaxError(
        `Cannot parse path: unexpected part "${remainder}" at position ${
          path.length - remainder.length
        }`
      )
    }

    jsonPath.push(match[1] || match[2] || match[3])
    remainder = remainder.substring(match[0].length)
  }

  return jsonPath
}

const regexJsonPathDotProp = '^\\.([A-zA-Z$_][a-zA-Z$_0-9]*)' // matches ".foo" at the start
const regexJsonPathArrayIndex = '^\\[([0-9]+)]' // matches "[123]" at the start
const regexJsonPathArrayProp = "^\\['(.*)']" // matches "['foo-bar baz']" at the start
const regexJsonPathProp = new RegExp(
  [regexJsonPathDotProp, regexJsonPathArrayIndex, regexJsonPathArrayProp].join('|')
)

/**
 * Convert a JSONPath into an option for use in a select box
 */
export function pathToOption(path: JSONPath): { value: JSONPath; label: string } {
  return {
    value: path,
    label: isEmpty(path) ? '(whole item)' : stripRootObject(stringifyJSONPath(path))
  }
}

/**
 * Stringify a JSON path into a lodash path like:
 *
 *     "data[2].nested.name"
 *
 * or
 *
 *     ["data", 2, "nested property", "name"]
 */
export function createLodashPropertySelector(path: JSONPath): string {
  return path.every((prop) => integerNumberRegex.test(prop) || javaScriptPropertyRegex.test(prop))
    ? "'" + path.map(stringifyJSONPathProp).join('').replace(/^\./, '') + "'"
    : JSON.stringify(path)
}

/**
 * Create a JavaScript property selector
 *
 * Turn a paths like:
 *
 *   ['location', 'latitude']
 *   ['address', 'full name']
 *
 * into a JavaScript selector (string) like:
 *
 *   '?.location?.latitude'
 *   '?.address?.["full name"]'
 */
export function createPropertySelector(path: JSONPath): string {
  return path
    .map((prop) => {
      if (integerNumberRegex.test(prop)) {
        // an index
        return `?.[${prop}]`
      } else if (javaScriptPropertyRegex.test(prop)) {
        // a key without special characters
        return `?.${prop}`
      } else {
        // a key that may have special characters (like spaces or so)
        return `?.[${JSON.stringify(prop)}]`
      }
    })
    .join('')
}

// https://developer.mozilla.org/en-US/docs/Glossary/Identifier
// Note: We can extend this regex to allow unicode characters too.
// I'm too lazy to figure that out right now
const javaScriptPropertyRegex = /^[a-zA-Z$_][a-zA-Z$_\d]*$/
const integerNumberRegex = /^\d+$/

/**
 * Create a memoized function that will memoize the input path, and return
 * the memoized instance of the path when the stringified version is the same.
 */
export function createMemoizePath(): (path: JSONPath) => JSONPath {
  return memoize((path) => path, stringifyJSONPath)
}
