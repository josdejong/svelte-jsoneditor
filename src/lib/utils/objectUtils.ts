import type { JSONPath } from 'immutable-json-patch'
import { isObject } from './typeUtils.js'
import type { JSONValue } from '$lib/types.js'

export function traverse(
  json: JSONValue,
  callback: (value: JSONValue, path: JSONPath, json: JSONValue) => boolean | void
) {
  const currentPath: JSONPath = []

  function recurse(value: JSONValue) {
    const res = callback(value, currentPath, json)
    if (res === false) {
      return
    }

    const pathIndex = currentPath.length

    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        currentPath[pathIndex] = String(index)
        recurse(value[index])
      }
    } else if (isObject(value)) {
      for (const key of Object.keys(value)) {
        currentPath[pathIndex] = key
        recurse(value[key])
      }
    }

    currentPath.pop()
  }

  recurse(json)
}
