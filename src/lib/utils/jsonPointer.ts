import type { JSONPointerMap } from '$lib/types'
import type { JSONPointer } from 'immutable-json-patch'
import { startsWithJSONPointer } from 'immutable-json-patch'

// TODO: write unit tests
export function filterMapOrUndefined<T>(
  map: JSONPointerMap<T> | undefined,
  filter: (pointer: JSONPointer, value: T) => boolean
): JSONPointerMap<T> | undefined {
  if (!map) {
    return undefined
  }

  const filteredMap: JSONPointerMap<T> = {}

  for (const p of Object.keys(map)) {
    if (filter(p, map[p])) {
      filteredMap[p] = map[p]
    }
  }

  return Object.keys(filteredMap).length > 0 ? filteredMap : undefined
}

// TODO: write unit tests
export function filterPointerOrUndefined<T>(
  map: JSONPointerMap<T> | undefined,
  pointer: JSONPointer
): JSONPointerMap<T> | undefined {
  return filterMapOrUndefined(map, (p) => startsWithJSONPointer(p, pointer))
}
