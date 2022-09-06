// TODO: unit test typeUtils.js

import { isDigit, isNumber } from './numberUtils.js'

/**
 * Test whether a value is an Object (and not an Array or Class)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    value.constructor === Object && // do not match on classes or Array
    !Array.isArray(value)
  )
}

/**
 * Test whether a value is an Object or an Array (and not a Class)
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function isObjectOrArray(value: unknown): value is Object | Array<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value.constructor === Object || value.constructor === Array)
  )
}

/**
 * Test whether a value is a boolean
 *
 * @param {*} value
 * @return {boolean}
 */
export function isBoolean(value: unknown): value is boolean {
  return value === true || value === false
}

/**
 * Test whether a value is a timestamp in milliseconds after the year 2000.
 */
export function isTimestamp(value: unknown): value is number {
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
 * Returns the color if the input is a valid color, and returns null otherwise.
 *
 * Example output:
 *
 *     'rgba(255,0,0,0.7)' or 'rgb(255,0,0)'
 *
 * Source: https://stackoverflow.com/questions/6386090/validating-css-color-names/33184805
 */
export function getColorCSS(color: string): string | null {
  // TODO: test performance impact of this function
  const colorStyleElement = window.document.createElement('div')

  colorStyleElement.style.color = color
  return colorStyleElement.style.color.split(/\s+/).join('').toLowerCase() || null
}

/**
 * Test if a string contains a valid color name or code.
 * Returns true if a valid color, false otherwise
 */
export function isColor(value: unknown): boolean {
  return typeof value === 'string' && !!getColorCSS(value)
}

/**
 * Get the type of the value
 */
// TODO: unit test valueType()
export function valueType(value: unknown, parser: JSON): string {
  // primitive types
  if (
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    value === null
  ) {
    return typeof value
  }

  if (Array.isArray(value)) {
    return 'array'
  }
  if (isObject(value)) {
    // plain object only
    return 'object'
  }

  // unknown type. Try out what stringfying results in
  const valueStr = parser.stringify(value)
  if (valueStr[0] === '"') {
    return 'string'
  }
  if (isDigit(valueStr[0])) {
    return 'number'
  }
  if (valueStr === 'true' || valueStr === 'false') {
    return 'boolean'
  }
  if (valueStr === 'null') {
    return 'null'
  }

  return 'unknown'
}

/**
 * Test whether a text contains a url (matches when a string starts
 * with 'http://*' or 'https://*' and has no whitespace characters)
 */
const isUrlRegex = /^https?:\/\/\S+$/
export function isUrl(text: unknown): boolean {
  return typeof text === 'string' && isUrlRegex.test(text)
}

/**
 * Convert contents of a string to the correct JSON type. This can be a string,
 * a number, a boolean, etc
 */
export function stringConvert(str: string, parser: JSON): string | null | boolean | number {
  if (str === '') {
    return ''
  }

  const strTrim = str.trim()

  if (strTrim === 'null') {
    return null
  }

  if (strTrim === 'true') {
    return true
  }

  if (strTrim === 'false') {
    return false
  }

  if (isNumber(strTrim)) {
    return parser.parse(strTrim)
  }

  return str
}

/**
 * Test whether a string contains a numeric, boolean, or null value.
 * Returns true when the string contains a number, boolean, or null.
 */
export function isStringContainingPrimitiveValue(str: unknown, parser: JSON): boolean {
  return typeof str === 'string' && typeof stringConvert(str, parser) !== 'string'
}
