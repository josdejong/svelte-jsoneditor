// TODO: unit test typeUtils.js

import { containsNumber } from './numberUtils.js'
import type { JSONParser } from '../types.js'

/**
 * Test whether a value is an Object (and not an Array or Class)
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  // note that we check constructor.name, not constructor === Object,
  // so we can use objects created in a different JS realm like an iframe.
  return (
    typeof value === 'object' &&
    value !== null &&
    (value.constructor === undefined || value.constructor.name === 'Object')
  )
}

/**
 * Test whether a value is an Object or an Array (and not a Class)
 */
export function isObjectOrArray(value: unknown): value is object | Array<unknown> {
  // Note that we check constructor.name, not constructor === Object,
  // so we can use objects created in a different JS realm like an iframe.
  return (
    typeof value === 'object' &&
    value !== null &&
    (value.constructor === undefined ||
      value.constructor.name === 'Object' ||
      value.constructor.name === 'Array')
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
export function isTimestamp(value: unknown): boolean {
  const YEAR_2000 = 946684800000

  if (typeof value === 'number') {
    return (
      value > YEAR_2000 &&
      isFinite(value) &&
      Math.floor(value) === value &&
      !isNaN(new Date(value).valueOf())
    )
  }

  if (typeof value === 'bigint') {
    return isTimestamp(Number(value))
  }

  // try getting the primitive value if that is different. For example when having a LosslessNumber
  try {
    const valueOf = value ? value.valueOf() : value
    if (valueOf !== value) {
      return isTimestamp(valueOf)
    }
  } catch {
    return false
  }

  return false
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
export function getColorCSS(color: string): string | undefined {
  colorTestDiv = colorTestDiv || window.document.createElement('div')

  colorTestDiv.style.color = ''
  colorTestDiv.style.color = color

  const applied = colorTestDiv.style.color
  return applied !== '' ? applied.replace(/\s+/g, '').toLowerCase() : undefined
}
let colorTestDiv: HTMLDivElement | undefined = undefined

/**
 * Test if a string contains a valid color name or code.
 * Returns true if a valid color, false otherwise
 */
export function isColor(value: unknown): boolean {
  const maxColorLength = 99
  return typeof value === 'string' && value.length < maxColorLength && !!getColorCSS(value)
}

/**
 * Get the type of the value
 */
export function valueType(value: unknown, parser: JSONParser): string {
  // primitive types
  if (
    typeof value === 'number' ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'undefined'
  ) {
    return typeof value
  }
  if (typeof value === 'bigint') {
    return 'number' // we return number here, not bigint: all numeric types should return the same name
  }
  if (value === null) {
    return 'null'
  }

  if (Array.isArray(value)) {
    return 'array'
  }
  if (isObject(value)) {
    // plain object only
    return 'object'
  }

  // unknown type (like a LosslessNumber). Try out what stringfying results in
  const valueStr = parser.stringify(value)
  if (valueStr && containsNumber(valueStr)) {
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
export function stringConvert(str: string, parser: JSONParser): unknown {
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

  if (containsNumber(strTrim)) {
    return parser.parse(strTrim)
  }

  return str
}

/**
 * Test whether a string contains a numeric, boolean, or null value.
 * Returns true when the string contains a number, boolean, or null.
 */
export function isStringContainingPrimitiveValue(str: unknown): boolean {
  // note that we can safely use JSON parser here instead of the configured JSONParser,
  // since we do not actually use the parsed number, just want to check that it is not a string
  return typeof str === 'string' && typeof stringConvert(str, JSON) !== 'string'
}

/**
 * Test whether a string contains an integer number
 */
export function isInteger(value: string): boolean {
  return INTEGER_REGEX.test(value)
}

const INTEGER_REGEX = /^-?[0-9]+$/
