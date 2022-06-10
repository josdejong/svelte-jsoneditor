import type { JSONData, Path } from '../types'
import { isObject } from './typeUtils.js'

// TODO: unit test
export function traverse(
  json: JSONData,
  callback: (value: JSONData, path: Path, json: JSONData) => boolean | void
) {
  const currentPath: Path = []

  function recurse(child: JSONData) {
    const res = callback(child, currentPath, json)

    if (res === false) {
      return
    }

    const pathIndex = currentPath.length

    if (Array.isArray(child)) {
      child.forEach((value, index) => {
        currentPath[pathIndex] = index
        recurse(value)
      })
    } else if (isObject(child)) {
      Object.keys(child).forEach((key) => {
        currentPath[pathIndex] = key
        recurse(child[key])
      })
    }

    currentPath.pop()
  }

  recurse(json)
}
