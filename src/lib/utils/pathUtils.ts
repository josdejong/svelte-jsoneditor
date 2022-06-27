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
export function stringifyPathProp(prop: string | number): string {
  if (typeof prop === 'number') {
    return '[' + prop + ']'
  } else if (typeof prop === 'string' && prop.match(/^[A-Za-z\d_$]+$/)) {
    return '.' + prop
  } else {
    return '[' + JSON.stringify(prop) + ']'
  }
}

/**
 * Parse a string containing a path like:
 *
 *     ".data[2].nested.property"
 *
 * into a Path:
 *
 *     ["data", 2, "nested", "property"]
 */
export function parsePath(pathStr: string): JSONPath {
  const path = []

  let start = 0
  let index = 0
  while (index < pathStr.length) {
    if (pathStr[index] === '.') {
      // parse a property like '.array'
      index++
      start = index
      while (pathStr[index] !== '.' && pathStr[index] !== '[' && index < pathStr.length) {
        index++
      }
      path.push(pathStr.substring(start, index))
    }

    if (pathStr[index] === '[') {
      // parse a property like '[2]' or '["prop with spaces"]'
      index++

      if (pathStr[index] === '"') {
        // parse a property like '["prop with spaces"]'
        start = index
        index++
        while ((pathStr[index] !== '"' || pathStr[index - 1] === '\\') && index < pathStr.length) {
          index++
        }
        index++ // include the end quote "
        path.push(JSON.parse(pathStr.substring(start, index)))
      } else {
        // parse a property like '[2]'
        start = index
        while (pathStr[index] !== ']' && index < pathStr.length) {
          index++
        }
        path.push(parseInt(pathStr.substring(start, index), 10))
      }

      index++ // skip the ']'
    }
  }

  return path
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
export function createMemoizePath(): (path: JSONPath) => JSONPath {
  return memoize((path) => path, stringifyPath)
}
