import type { JSONPath } from 'immutable-json-patch'
import type { JSONArray } from 'immutable-json-patch'
import { first } from 'lodash-es'

// TODO: unit test
export function getColumns(json: JSONArray): JSONPath[] {
  // TODO: create columns for nested objects
  // FIXME: should iterate over the whole object?
  return Object.keys(first(json)).map((key) => [key])
}
