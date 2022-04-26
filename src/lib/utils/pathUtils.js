import { memoize } from 'lodash-es'

/**
 * Stringify a path like
 *
 *     ["data", 2, "nested", "property"]
 *
 * into a string:
 *
 *     ".data[2].nested.property"
 */
export function stringifyPath(path) {
  return path
    .map((prop) => {
      if (typeof prop === 'number') {
        return '[' + prop + ']'
      } else if (typeof prop === 'string' && prop.match(/^[A-Za-z0-9_$]+$/)) {
        return '.' + prop
      } else {
        return '["' + prop + '"]'
      }
    })
    .join('')
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
 *
 * @param {Path} path
 * @returns {string}
 */
export function createPropertySelector(path) {
  return path
    .map((prop) => {
      return javaScriptPropertyRegex.test(prop) ? `?.${prop}` : `?.[${JSON.stringify(prop)}]`
    })
    .join('')
}

// https://developer.mozilla.org/en-US/docs/Glossary/Identifier
// Note: We can extend this regex to allow unicode characters too.
// I'm too lazy to figure that out right now
const javaScriptPropertyRegex = /^[A-z$_][A-z$_\d]*$/i

/**
 * Create a memoized function that will memoize the input path, and return
 * the memoized instance of the path when the stringified version is the same.
 *
 * @returns {(path: Path) => Path}
 */
export function createMemoizePath() {
  return memoize((path) => path, stringifyPath)
}
