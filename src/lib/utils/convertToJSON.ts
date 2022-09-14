import { isObject } from './typeUtils.js'
import type {
  JavaScriptArray,
  JavaScriptObject,
  JavaScriptPrimitive,
  JavaScriptValue,
  JSONArray,
  JSONObject,
  JSONPrimitive,
  JSONValue
} from 'lossless-json'
import { toSafeNumberOrThrow } from 'lossless-json'

/**
 * Convert a JSON document containing non-primitive values like LosslessNumber
 * or bigint into a plain JSON document with just numbers.
 */
export function convertToJSON(
  value: JavaScriptValue,
  convertValue: (value: JavaScriptValue) => JSONValue = defaultConvertValue
): JSONValue {
  if (isJavaScriptObject(value)) {
    return convertObjectToJSON(value)
  }

  if (isJavaScriptArray(value)) {
    return convertArrayToJSON(value)
  }

  return convertValue(value)
}

function convertObjectToJSON(object: JavaScriptObject): JSONObject {
  const converted: JSONObject = {}

  for (const key in object) {
    converted[key] = convertToJSON(object[key])
  }

  return converted
}

function convertArrayToJSON(array: JavaScriptArray): JSONArray {
  return array.map((item) => convertToJSON(item))
}

function isJavaScriptObject(value: unknown): value is JavaScriptObject {
  return isObject(value)
}

function isJavaScriptArray(value: unknown): value is JavaScriptArray {
  return Array.isArray(value)
}

function defaultConvertValue(value: JavaScriptPrimitive): JSONPrimitive {
  if (
    value === null ||
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'string'
  ) {
    return value
  }

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  if (value.isLosslessNumber === true) {
    return toSafeNumberOrThrow(value.toString(), { approx: true }) as JSONPrimitive
  }

  if (typeof value === 'bigint') {
    const num = Number(value)

    if (!Number.isSafeInteger(num)) {
      throw new Error(
        'Cannot safely convert to number: ' + `the value ${value} would truncate and become ${num}`
      )
    }

    return num
  }

  return value?.valueOf() as JSONPrimitive
}
