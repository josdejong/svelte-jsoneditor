/**
 * Find a unique name. Suffix the name with ' (copy)', '(copy 2)', etc
 * until a unique name is found
 * @param {string} name
 * @param {string[]} keys    Array with existing keys
 */
export function findUniqueName(name, keys) {
  const keysSet = new Set(keys)

  // remove any " (copy)" or " (copy 2)" suffix from the name
  const nameWithoutCopySuffix = name.replace(/ \(copy( \d+)?\)$/, '')

  let validName = name
  let i = 1

  while (keysSet.has(validName)) {
    const copy = 'copy' + (i > 1 ? ' ' + i : '')
    validName = `${nameWithoutCopySuffix} (${copy})`
    i++
  }

  return validName
}

/**
 * Transform a text into lower case with the first character upper case
 * @param {string} text
 * @return {string}
 */
export function toCapital(text) {
  return text && text.length > 0 ? text[0].toUpperCase() + text.substr(1).toLowerCase() : text
}

export function compareStrings(a, b) {
  return a < b ? -1 : a > b ? 1 : 0
}

/**
 * Duplicate a piece of text
 * @param {string} text
 * @param {number} anchorOffset
 * @param {number} focusOffset
 * @return {string}
 */
export function duplicateInText(text, anchorOffset, focusOffset) {
  const startOffset = Math.min(anchorOffset, focusOffset)
  const endOffset = Math.max(anchorOffset, focusOffset)

  return (
    text.slice(0, endOffset) +
    text.slice(startOffset, endOffset) + // the duplicated piece of the text
    text.slice(endOffset)
  )
}

/**
 * Truncate a text to a maximum length.
 * When truncated, the text will pe appended with ellipsis '...'
 * @param {string} text Text to be truncated
 * @param {number} maxLength Maximum allowed length for the text including ellipsis
 */
export function truncate(text, maxLength) {
  const ellipsis = '...'
  const maxTextLength = maxLength - ellipsis.length

  return text.length > maxLength ? text.substr(0, maxTextLength) + ellipsis : text
}

/**
 * Cast contents of a string to the correct type.
 * This can be a string, a number, a boolean, null, undefined, etc
 * @param {string} str
 * @return {string | number | boolean | null | undefined} parsed string
 */
export function parseString(str) {
  if (str === '') {
    return ''
  }

  const lower = str.toLowerCase()
  if (lower === 'null') {
    return null
  }
  if (lower === 'true') {
    return true
  }
  if (lower === 'false') {
    return false
  }
  if (lower === 'undefined') {
    return undefined
  }

  const num = Number(str) // will nicely fail with '123ab'
  const numFloat = parseFloat(str) // will nicely fail with '  '
  if (!isNaN(num) && !isNaN(numFloat)) {
    return num
  }

  return str
}
