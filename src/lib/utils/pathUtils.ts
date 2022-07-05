import { memoize } from 'lodash-es'
import type { JSONPath } from 'immutable-json-patch'

/**
 * Stringify a path like:
 *
 *     ["data", 2, "nested", "property"]
 *
 * into a string:
 *
 *     ".data[2].nested.property"
 */
export function stringifyPath(path: JSONPath): string {
  return path.map(stringifyPathProp).join('')
}

/**
 * Stringify a single property of a path. See also stringifyPath
 */
export function stringifyPathProp(prop: string): string {
  if (integerNumberRegex.test(prop)) {
    return '[' + prop + ']'
  } else if (javaScriptPropertyRegex.test(prop)) {
    return '.' + prop
  } else {
    return '[' + JSON.stringify(prop) + ']'
  }
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
const javaScriptPropertyRegex = /^[A-z$_][A-z$_\d]*$/i
const integerNumberRegex = /^\d+$/

/**
 * Create a memoized function that will memoize the input path, and return
 * the memoized instance of the path when the stringified version is the same.
 */
export function createMemoizePath(): (path: JSONPath) => JSONPath {
  return memoize((path) => path, stringifyPath)
}
