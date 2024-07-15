import { test, describe, expect } from 'vitest'
import {
  findNestedArrays,
  fromTableCellPosition,
  getColumns,
  getRecursiveKeys,
  getShallowKeys,
  groupValidationErrors,
  maintainColumnOrder,
  mergeValidationErrors,
  operationAffectsSortedColumn,
  selectNextColumn,
  selectNextRow,
  selectPreviousColumn,
  selectPreviousRow,
  stringifyTableCellPosition,
  toTableCellPosition
} from './table.js'
import { deepStrictEqual } from 'assert'
import type { JSONPath } from 'immutable-json-patch'
import { createValueSelection } from './selection.js'
import type { SortedColumn, ValidationError } from '$lib/types.js'
import { SortDirection, ValidationSeverity } from '$lib/types.js'

describe('table', () => {
  const json: unknown[] = [
    { name: 'Joe', address: { city: 'New York', street: 'Main street' }, scores: [1, 2, 3] },
    {
      name: 'Sarah',
      address: { city: 'Amsterdam', street: 'Stationsplein' },
      scores: [1, 2, 3],
      updated: '2022-01-01'
    }
  ]

  test('should extract table columns from data without flattening', () => {
    deepStrictEqual(getColumns(json, false), [['name'], ['address'], ['scores'], ['updated']])
    deepStrictEqual(getColumns(json, false, 1), [['name'], ['address'], ['scores']])
    deepStrictEqual(getColumns([1, 2, 3], false), [[]])
    deepStrictEqual(getColumns([], false), [])
  })

  test('should extract table columns from data with flattening', () => {
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

  test('should extract table columns from non-homogeneous data', () => {
    const data = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }, { id: 5, name: 'Sarah' }]

    expect(getColumns(data, true, 2)).toEqual([['id'], ['name']])
  })

  test('should extract table columns from conflicting data structures', () => {
    const data = [{ item: 1 }, { item: { id: 1, name: 'Sarah' } }]

    expect(getColumns(data, true)).toEqual([['item'], ['item', 'id'], ['item', 'name']])
  })

  test('should maintain the column order', () => {
    const previous = [['id'], ['name']]

    expect(maintainColumnOrder([['name'], ['id']], previous)).toEqual([['id'], ['name']])
    expect(maintainColumnOrder([['address'], ['name'], ['id']], previous)).toEqual([
      ['id'],
      ['name'],
      ['address']
    ])
    expect(maintainColumnOrder([['address'], ['id']], previous)).toEqual([['id'], ['address']])
  })

  test('should return an empty array on non-array input', () => {
    deepStrictEqual(getColumns({} as unknown[], false), [])

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    deepStrictEqual(getColumns(null, false), [])

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    deepStrictEqual(getColumns(undefined, false), [])

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    deepStrictEqual(getColumns('foo', false), [])
  })

  test('should collect recursive keys from an object', () => {
    deepStrictEqual(getRecursiveKeys({ a: 1, b: 2 }), [['a'], ['b']])
    deepStrictEqual(
      getRecursiveKeys({ a: [1, 2, 3], b: { nested1: 4, nested2: { foo: 5, bar: [] } }, c: 42 }),
      [['a'], ['b', 'nested1'], ['b', 'nested2', 'foo'], ['b', 'nested2', 'bar'], ['c']]
    )
  })

  test('should collect shallow keys from an object or value', () => {
    deepStrictEqual(getShallowKeys({ a: 1, b: 2, c: { d: 3 } }), [['a'], ['b'], ['c']])
    deepStrictEqual(getShallowKeys(42), [[]])
  })

  describe('selection', () => {
    const columns: JSONPath[] = [['id'], ['name'], ['address', 'city'], ['other']]
    const json = [
      { id: 1, name: 'Joe', address: { city: 'Amsterdam' } },
      { id: 2, name: 'Sarah', address: { city: 'Groningen' } }
    ]

    test('toTableCellPosition', () => {
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

      deepStrictEqual(toTableCellPosition([], columns), {
        rowIndex: -1,
        columnIndex: -1
      })
    })

    test('toTableCellPosition of a non-flattened, nested item', () => {
      deepStrictEqual(toTableCellPosition(['2', 'other', 'nickname'], columns), {
        rowIndex: 2,
        columnIndex: 3
      })
    })

    test('fromTableCellPosition', () => {
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

    test('selectPreviousRow', () => {
      deepStrictEqual(
        selectPreviousRow(columns, createValueSelection(['2', 'id'])),
        createValueSelection(['1', 'id'])
      )

      deepStrictEqual(
        selectPreviousRow(columns, createValueSelection(['0', 'id'])),
        createValueSelection(['0', 'id'])
      )
    })

    test('selectNextRow', () => {
      deepStrictEqual(
        selectNextRow(json, columns, createValueSelection(['0', 'id'])),
        createValueSelection(['1', 'id'])
      )

      deepStrictEqual(
        selectNextRow(json, columns, createValueSelection(['1', 'id'])),
        createValueSelection(['1', 'id'])
      )
    })

    test('selectPreviousColumn', () => {
      deepStrictEqual(
        selectPreviousColumn(columns, createValueSelection(['2', 'name'])),
        createValueSelection(['2', 'id'])
      )

      deepStrictEqual(
        selectPreviousColumn(columns, createValueSelection(['2', 'id'])),
        createValueSelection(['2', 'id'])
      )
    })

    test('selectNextColumn', () => {
      deepStrictEqual(
        selectNextColumn(columns, createValueSelection(['2', 'id'])),
        createValueSelection(['2', 'name'])
      )

      deepStrictEqual(
        selectNextColumn(columns, createValueSelection(['2', 'other'])),
        createValueSelection(['2', 'other'])
      )
    })

    test('stringifyTableCellPosition', () => {
      deepStrictEqual(stringifyTableCellPosition({ rowIndex: 2, columnIndex: 5 }), '2:5')
    })
  })

  describe('groupValidationErrors', () => {
    const columns = [['id'], ['name'], ['address'], ['array']]

    test('should put root errors in root', () => {
      const error: ValidationError = {
        message: 'must NOT have fewer than 999 items',
        path: [],
        severity: ValidationSeverity.warning
      }

      deepStrictEqual(groupValidationErrors([error], columns), {
        root: [error],
        rows: {}
      })
    })

    test('should put cell errors in the right cell', () => {
      const error: ValidationError = {
        message: 'must be number',
        path: ['5', 'array', '2'],
        severity: ValidationSeverity.warning
      }

      deepStrictEqual(groupValidationErrors([error], columns), {
        root: [],
        rows: {
          '5': {
            row: [],
            columns: {
              '3': [error]
            }
          }
        }
      })
    })

    test('should put row errors in the row header', () => {
      const error: ValidationError = {
        message: 'should NOT have additional property: unknownProp',
        path: ['9'],
        severity: ValidationSeverity.warning
      }

      deepStrictEqual(groupValidationErrors([error], columns), {
        root: [],
        rows: {
          '9': {
            row: [error],
            columns: {}
          }
        }
      })
    })

    test('should put missing nested required properties in the right column', () => {
      const error: ValidationError = {
        path: ['3', 'address'],
        message: "must have required property 'city'",
        severity: ValidationSeverity.warning
      }

      deepStrictEqual(groupValidationErrors([error], columns), {
        root: [],
        rows: {
          '3': {
            row: [],
            columns: {
              '2': [error]
            }
          }
        }
      })
    })
  })

  test('mergeValidationErrors', () => {
    const path = ['2', 'object']
    const errors = [
      {
        message: 'must be number',
        path: ['5', 'array', '2'],
        severity: ValidationSeverity.warning
      },
      {
        message: 'must be number',
        path: ['5', 'array', '3'],
        severity: ValidationSeverity.warning
      }
    ]

    deepStrictEqual(mergeValidationErrors(path, errors), {
      path,
      message:
        'Multiple validation issues: [5].array[2] must be number, [5].array[3] must be number',
      severity: ValidationSeverity.warning
    })

    deepStrictEqual(mergeValidationErrors(path, []), undefined)
  })

  test('operationAffectsSortedColumn', () => {
    const columns = [['id'], ['name'], ['address'], ['array']]
    const sortedColumn: SortedColumn = {
      path: ['name'],
      sortDirection: SortDirection.asc
    }

    deepStrictEqual(
      operationAffectsSortedColumn(sortedColumn, { op: 'add', path: '/2', value: 42 }, columns),
      true
    )

    deepStrictEqual(
      operationAffectsSortedColumn(
        sortedColumn,
        { op: 'replace', path: '/1/name', value: 'Joe' },
        columns
      ),
      true
    )

    deepStrictEqual(
      operationAffectsSortedColumn(
        sortedColumn,
        { op: 'replace', path: '/1/id', value: 42 },
        columns
      ),
      false
    )

    deepStrictEqual(
      operationAffectsSortedColumn(
        sortedColumn,
        {
          op: 'replace',
          path: '/1/address/city',
          value: 'Rotterdam'
        },
        columns
      ),
      false
    )
  })

  describe('findNestedArrays', () => {
    test('should a nested array', () => {
      deepStrictEqual(
        findNestedArrays({
          array: [1, 2, 3]
        }),
        [['array']]
      )
    })

    test('should find multiple nested arrays', () => {
      deepStrictEqual(
        findNestedArrays({
          array1: [1, 2, 3],
          array2: [1, 2, 3]
        }),
        [['array1'], ['array2']]
      )
    })

    test('should find deeper nested arrays', () => {
      deepStrictEqual(
        findNestedArrays({
          a: { b: [1, 2, 3] }
        }),
        [['a', 'b']]
      )
    })

    test('should find root level array', () => {
      deepStrictEqual(findNestedArrays([1, 2, 3]), [[]])
    })

    test('should respect maxLevel when finding a nested array', () => {
      const json = {
        array1: [],
        level1: {
          array2: [],
          level2: {
            array3: []
          }
        }
      }

      deepStrictEqual(findNestedArrays(json), [['array1'], ['level1', 'array2']])

      deepStrictEqual(findNestedArrays(json, 1), [['array1']])

      deepStrictEqual(findNestedArrays(json, 3), [
        ['array1'],
        ['level1', 'array2'],
        ['level1', 'level2', 'array3']
      ])
    })
  })
})
