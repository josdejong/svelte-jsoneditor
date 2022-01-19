// TODO: unit test typeUtils.js

/**
 * Test whether a value is an Object (and not an Array!)
 *
 * @param {*} value
 * @return {boolean}
 */
export function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Test whether a value is not an object or array, but null, number, string, or
 * boolean.
 * @param {*} value
 * @return {boolean}
 */
export function isValue(value) {
  return (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean'
  )
}

/**
 * Test whether a value is an Object or an Array
 *
 * @param {*} value
 * @return {boolean}
 */
export function isObjectOrArray(value) {
  return typeof value === 'object' && value !== null
}

/**
 * Test whether a value is a boolean
 *
 * @param {*} value
 * @return {boolean}
 */
export function isBoolean(value) {
  return value === true || value === false
}

/**
 * Test whether a value is a timestamp in milliseconds after the year 2000.
 * @param {*} value
 * @return {boolean}
 */
export function isTimestamp(value) {
  const YEAR_2000 = 946684800000

  return (
    typeof value === 'number' &&
    value > YEAR_2000 &&
    isFinite(value) &&
    Math.floor(value) === value &&
    !isNaN(new Date(value).valueOf())
  )
}

/**
 * Get the applied color given a color name or code
 * Source: https://stackoverflow.com/questions/6386090/validating-css-color-names/33184805
 * @param {string} color
 * @returns {string | null} returns the color if the input is a valid
 *                   color, and returns null otherwise. Example output:
 *                   'rgba(255,0,0,0.7)' or 'rgb(255,0,0)'
 */
export function getColorCSS(color) {
  // TODO: test performance impact of this function
  const colorStyleElement = document.createElement('div')

  colorStyleElement.style.color = color
  return colorStyleElement.style.color.split(/\s+/).join('').toLowerCase() || null
}

/**
 * Test if a string contains a valid color name or code.
 * @param {string} value
 * @returns {boolean} returns true if a valid color, false otherwise
 */
export function isColor(value) {
  return !!getColorCSS(value)
}

/**
 * Get the type of a value
 * @param {*} value
 * @return {String} type
 */
export function valueType(value) {
  if (value === null) {
    return 'null'
  }
  if (value === undefined) {
    return 'undefined'
  }
  if (typeof value === 'number') {
    return 'number'
  }
  if (typeof value === 'string') {
    return 'string'
  }
  if (typeof value === 'boolean') {
    return 'boolean'
  }
  if (value instanceof RegExp) {
    return 'regexp'
  }
  if (Array.isArray(value)) {
    return 'array'
  }

  return 'object'
}

/**
 * Test whether a text contains a url (matches when a string starts
 * with 'http://*' or 'https://*' and has no whitespace characters)
 * @param {String} text
 */
const isUrlRegex = /^https?:\/\/\S+$/
export function isUrl(text) {
  return typeof text === 'string' && isUrlRegex.test(text)
}

/**
 * Convert contents of a string to the correct JSON type. This can be a string,
 * a number, a boolean, etc
 * @param {String} str
 * @return {*} castedStr
 * @private
 */
export function stringConvert(str) {
  if (str === '') {
    return ''
  }

  if (str === 'null') {
    return null
  }

  if (str === 'true') {
    return true
  }

  if (str === 'false') {
    return false
  }

  const num = Number(str)
  if (
    !isNaN(num) && // will nicely fail with '123ab'
    !isNaN(parseFloat(str)) // will nicely fail with '  '
  ) {
    return num
  } else {
    return str
  }
}

/**
 * Test whether a string contains a numeric, boolean, or null value.
 * Returns true when the string contains a number, boolean, or null.
 * @param {any} str
 * @return {boolean}
 */
export function isStringContainingPrimitiveValue(str) {
  return typeof str === 'string' && typeof stringConvert(str) !== 'string'
}
