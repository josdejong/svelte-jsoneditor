import { isEmpty } from 'lodash-es'
import type { JSONPath } from 'immutable-json-patch'
import type { PathOption } from '$lib/types.js'

/**
 **
 * Stringify an array with a path like ['items', '3', 'name'] into string like 'items[3].name'
 * Note that we allow all characters in a property name, like "item with spaces[3].name",
 * so this path is not usable as-is in JavaScript.
 */
export function stringifyJSONPath(path: JSONPath): string {
  return path
    .map((p, index) => {
      return integerNumberRegex.test(p)
        ? '[' + p + ']'
        : /[.[\]]/.test(p) || p === '' // match any character . or [ or ] and handle an empty string
          ? '["' + escapeQuotes(p) + '"]'
          : (index > 0 ? '.' : '') + p
    })
    .join('')
}

function escapeQuotes(prop: string): string {
  return prop.replace(/"/g, '\\"')
}

/**
 * Parse a JSON path like 'items[3].name' into a path like ['items', '3', 'name']
 */
export function parseJSONPath(pathStr: string): JSONPath {
  const path: JSONPath = []
  let i = 0

  while (i < pathStr.length) {
    if (pathStr[i] === '.') {
      i++
    }

    if (pathStr[i] === '[') {
      i++

      if (pathStr[i] === '"') {
        i++
        path.push(parseProp((c) => c === '"', true))
        eatCharacter('"')
      } else {
        path.push(parseProp((c) => c === ']'))
      }

      eatCharacter(']')
    } else {
      path.push(parseProp((c) => c === '.' || c === '['))
    }
  }

  function parseProp(isEnd: (char: string) => boolean, unescape = false) {
    let prop = ''

    while (i < pathStr.length && !isEnd(pathStr[i])) {
      if (unescape && pathStr[i] === '\\' && pathStr[i + 1] === '"') {
        // escaped double quote
        prop += '"'
        i += 2
      } else {
        prop += pathStr[i]
        i++
      }
    }

    return prop
  }

  function eatCharacter(char: string) {
    if (pathStr[i] !== char) {
      throw new SyntaxError(`Invalid JSON path: ${char} expected at position ${i}`)
    }
    i++
  }

  return path
}

/**
 * Convert a JSONPath into an option for use in a select box
 */
export function pathToOption(path: JSONPath): PathOption {
  return {
    value: path,
    label: isEmpty(path) ? '(item root)' : stringifyJSONPath(path)
  }
}

/**
 * Stringify a JSON path into a lodash path like:
 *
 *     ["data", 2, "nested property", "name"]
 *
 * into a lodash path like:
 *
 *     "data[2].nested.name"
 *
 */
export function createLodashPropertySelector(path: JSONPath): string {
  return path.length === 0
    ? ''
    : path.every((prop) => integerNumberRegex.test(prop) || javaScriptPropertyRegex.test(prop))
      ? "'" + path.map(stringifyLodashProperty).join('').replace(/^\./, '') + "'"
      : JSON.stringify(path)
}

/**
 * Stringify a single property of a JSON path. See also createLodashPropertySelector
 */
function stringifyLodashProperty(prop: string): string {
  if (integerNumberRegex.test(prop)) {
    return '[' + prop + ']'
  } else if (javaScriptPropertyRegex.test(prop)) {
    return '.' + prop
  } else {
    const propStr = JSON.stringify(prop)
    // remove enclosing double quotes, and unescape escaped double quotes \"
    const jsonPathStr = propStr.substring(1, propStr.length - 1).replace(/\\"/g, '"')
    return "['" + jsonPathStr + "']"
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
const javaScriptPropertyRegex = /^[a-zA-Z$_][a-zA-Z$_\d]*$/
const integerNumberRegex = /^\d+$/
