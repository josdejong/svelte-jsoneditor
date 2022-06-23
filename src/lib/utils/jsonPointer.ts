import { parseJSONPointer, getIn, compileJSONPointer } from 'immutable-json-patch'
import type { JSONData, JSONPointer, Path } from '../types'

/**
 * Parse a JSONPointer, and turn array indices into numeric values.
 * For example, '/array/2/name' returns ['array', 2, 'name'] when array turns
 * out to be an actual Array
 */
// TODO: unit test
export function parseJSONPointerWithArrayIndices(json: JSONData, pointer: JSONPointer): Path {
  const path = parseJSONPointer(pointer)

  // parse Array indexes into a number
  for (let i = 0; i < path.length; i++) {
    const section = path[i]

    if (ARRAY_INDEX_REGEX.exec(section as string)) {
      // this path part contains a number.
      // See if the document actually contains an array
      const parentPath = path.slice(0, i)
      const parent = getIn(json, parentPath)

      if (Array.isArray(parent)) {
        path[i] = parseInt(section as string, 10)
      }
    }
  }

  return path
}

// test whether a string only contains one or digits, like "1" or "204"
const ARRAY_INDEX_REGEX = /^\d+$/

export function pointerStartsWith(pointer: JSONPointer, searchPointer: JSONPointer): boolean {
  return (
    pointer.startsWith(searchPointer) &&
    (pointer.length === searchPointer.length || pointer[searchPointer.length] === '/')
  )
}

export function appendToPointer(pointer: JSONPointer, indexOrKey: string | number): JSONPointer {
  return pointer + compileJSONPointerProp(indexOrKey)
}

// TODO: export this util function from the immutable-json-patch library
export function compileJSONPointerProp(p: string | number) {
  return '/' + String(p).replace(/~/g, '~0').replace(/\//g, '~1')
}
