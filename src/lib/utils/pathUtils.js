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
 * Create a memoized function that will memoize the input path, and return
 * the memoized instance of the path when the stringified version is the same.
 *
 * @returns {(path: Path) => Path}
 */
export function createMemoizePath() {
  return memoize((path) => path, stringifyPath)
}
