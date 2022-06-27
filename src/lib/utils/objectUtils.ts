import type { JSONData, JSONPath } from 'immutable-json-patch'
import { isObject } from './typeUtils.js'

export function traverse(
  json: JSONData,
  callback: (value: JSONData, path: JSONPath, json: JSONData) => boolean | void
) {
  const currentPath: JSONPath = []

  function recurse(value: JSONData) {
    const res = callback(value, currentPath, json)
    if (res === false) {
      return
    }

    const pathIndex = currentPath.length

    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        currentPath[pathIndex] = index
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
