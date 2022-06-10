import { memoize } from 'lodash-es'
import type { Path } from '../types'

/**
 * Stringify a path like
 *
 *     ["data", 2, "nested", "property"]
 *
 * into a string:
 *
 *     ".data[2].nested.property"
 */
export function stringifyPath(path: Path): string {
  return path.map(stringifyPathProp).join('')
}

/**
 * Stringify a single property of a path. See also stringifyPath
 */
export function stringifyPathProp(prop: string | number): string {
  if (typeof prop === 'number') {
    return '[' + prop + ']'
  } else if (typeof prop === 'string' && prop.match(/^[A-Za-z0-9_$]+$/)) {
    return '.' + prop
  } else {
    return '["' + String(prop) + '"]'
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
export function createPropertySelector(path: Path): string {
  return path
    .map((prop) => {
      const propStr = String(prop)
      return javaScriptPropertyRegex.test(propStr) ? `?.${propStr}` : `?.[${JSON.stringify(prop)}]`
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
 */
export function createMemoizePath(): (path: Path) => Path {
  return memoize((path) => path, stringifyPath)
}
