import {
  fromTableCellPosition,
  getColumns,
  getRecursiveKeys,
  getShallowKeys,
  selectNextColumn,
  selectNextRow,
  selectPreviousColumn,
  selectPreviousRow,
  toTableCellPosition
} from './table.js'
import { deepStrictEqual } from 'assert'
import type { JSONArray, JSONPath } from 'immutable-json-patch'
import { createValueSelection } from './selection.js'

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
    deepStrictEqual(getColumns([1, 2, 3], false), [[]])
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
    deepStrictEqual(getColumns([1, 2, 3], true), [[]])
  })

  it('should return an empty array on non-array input', () => {
    deepStrictEqual(getColumns({} as JSONArray, false), [])
    deepStrictEqual(getColumns(null, false), [])
    deepStrictEqual(getColumns('foo' as unknown as JSONArray, false), [])
  })

  it('should collect recursive keys from an object', () => {
    deepStrictEqual(getRecursiveKeys({ a: 1, b: 2 }), [['a'], ['b']])
    deepStrictEqual(
      getRecursiveKeys({ a: [1, 2, 3], b: { nested1: 4, nested2: { foo: 5, bar: [] } }, c: 42 }),
      [['a'], ['b', 'nested1'], ['b', 'nested2', 'foo'], ['b', 'nested2', 'bar'], ['c']]
    )
  })

  it('should collect shallow keys from an object or value', () => {
    deepStrictEqual(getShallowKeys({ a: 1, b: 2, c: { d: 3 } }), [['a'], ['b'], ['c']])
    deepStrictEqual(getShallowKeys(42), [[]])
  })

  describe('selection', () => {
    const columns: JSONPath[] = [['id'], ['name'], ['address', 'city']]
    const json = [
      { id: 1, name: 'Joe', address: { city: 'Amsterdam' } },
      { id: 2, name: 'Sarah', address: { city: 'Groningen' } }
    ]

    it('toTableCellPosition', () => {
      deepStrictEqual(toTableCellPosition(['2', 'id'], columns), {
        rowIndex: 2,
        columnIndex: 0
      })

      deepStrictEqual(toTableCellPosition(['4', 'address', 'city'], columns), {
        rowIndex: 4,
        columnIndex: 2
      })

      deepStrictEqual(toTableCellPosition(['2', 'foo'], columns), {
        rowIndex: 2,
        columnIndex: -1
      })
    })

    it('fromTableCellPosition', () => {
      deepStrictEqual(
        fromTableCellPosition(
          {
            rowIndex: 2,
            columnIndex: 0
          },
          columns
        ),
        ['2', 'id']
      )

      deepStrictEqual(
        fromTableCellPosition(
          {
            rowIndex: 4,
            columnIndex: 2
          },
          columns
        ),
        ['4', 'address', 'city']
      )
    })

    it('selectPreviousRow', () => {
      deepStrictEqual(
        selectPreviousRow(columns, createValueSelection(['2', 'id'], false)),
        createValueSelection(['1', 'id'], false)
      )

      deepStrictEqual(
        selectPreviousRow(columns, createValueSelection(['0', 'id'], false)),
        createValueSelection(['0', 'id'], false)
      )
    })

    it('selectNextRow', () => {
      deepStrictEqual(
        selectNextRow(json, columns, createValueSelection(['0', 'id'], false)),
        createValueSelection(['1', 'id'], false)
      )

      deepStrictEqual(
        selectNextRow(json, columns, createValueSelection(['1', 'id'], false)),
        createValueSelection(['1', 'id'], false)
      )
    })

    it('selectPreviousColumn', () => {
      deepStrictEqual(
        selectPreviousColumn(columns, createValueSelection(['2', 'name'], false)),
        createValueSelection(['2', 'id'], false)
      )

      deepStrictEqual(
        selectPreviousColumn(columns, createValueSelection(['2', 'id'], false)),
        createValueSelection(['2', 'id'], false)
      )
    })

    it('selectNextColumn', () => {
      deepStrictEqual(
        selectNextColumn(columns, createValueSelection(['2', 'id'], false)),
        createValueSelection(['2', 'name'], false)
      )

      deepStrictEqual(
        selectNextColumn(columns, createValueSelection(['2', 'address', 'city'], false)),
        createValueSelection(['2', 'address', 'city'], false)
      )
    })
  })
})
