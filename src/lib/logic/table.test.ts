import { getColumns, getRecursiveKeys } from './table.js'
import { deepStrictEqual } from 'assert'
import type { JSONArray } from 'immutable-json-patch'

describe('table', () => {
  const json = [
    { name: 'Joe', address: { city: 'New York', street: 'Main street' }, scores: [1, 2, 3] },
    {
      name: 'Sarah',
      address: { city: 'Amsterdam', street: 'Stationsplein' },
      scores: [1, 2, 3],
      updated: '2022-01-01'
    }
  ]

  it('should extract table columns from data without flattening', () => {
    deepStrictEqual(getColumns(json, false), [['name'], ['address'], ['scores'], ['updated']])
    deepStrictEqual(getColumns(json, false, 1), [['name'], ['address'], ['scores']])
  })

  it('should return an empty array on non-array input', () => {
    deepStrictEqual(getColumns({} as JSONArray, false), [])
    deepStrictEqual(getColumns(null, false), [])
    deepStrictEqual(getColumns('foo' as unknown as JSONArray, false), [])
  })

  it('should extract table columns from data with flattening', () => {
    deepStrictEqual(getColumns(json, true), [
      ['name'],
      ['address', 'city'],
      ['address', 'street'],
      ['scores'],
      ['updated']
    ])
    deepStrictEqual(getColumns(json, true, 1), [
      ['name'],
      ['address', 'city'],
      ['address', 'street'],
      ['scores']
    ])
  })

  it('should collect recursive keys from an object', () => {
    deepStrictEqual(getRecursiveKeys({ a: 1, b: 2 }), [['a'], ['b']])
    deepStrictEqual(
      getRecursiveKeys({ a: [1, 2, 3], b: { nested1: 4, nested2: { foo: 5, bar: [] } }, c: 42 }),
      [['a'], ['b', 'nested1'], ['b', 'nested2', 'foo'], ['b', 'nested2', 'bar'], ['c']]
    )
  })
})
