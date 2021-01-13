
/**
 * Stringify a path like
 *
 *     ["data", 2, "nested", "property"]
 *
 * into a string:
 *
 *     ".data[2].nested.property"
 *
 * @param {Path}
 * @return {string}
 */
export function stringifyPath (path) {
  return path.map(prop => {
    return typeof prop === 'number'
      ? `[${prop}]`
      : `.${prop}`
  }).join('')
}
