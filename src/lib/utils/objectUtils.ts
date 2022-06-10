import type { JSONData, Path } from '../types'
import { isObject } from './typeUtils.js'

export function traverse(
  json: JSONData,
  callback: (value: JSONData, path: Path, json: JSONData) => boolean | void
) {
  const currentPath: Path = []

  function recurse(value: JSONData): void | boolean {
    const res = callback(value, currentPath, json)
    if (res === false) {
      return false
    }

    const pathIndex = currentPath.length

    if (Array.isArray(value)) {
      for (let index = 0; index < value.length; index++) {
        currentPath[pathIndex] = index
        const res = recurse(value[index])
        if (res === false) {
          return false
        }
      }
    } else if (isObject(value)) {
      for (const key of Object.keys(value)) {
        currentPath[pathIndex] = key
        const res = recurse(value[key])
        if (res === false) {
          return false
        }
      }
    }

    currentPath.pop()
  }

  recurse(json)
}
