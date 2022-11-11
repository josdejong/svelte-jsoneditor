import {
  fromTableCellPosition,
  getColumns,
  getRecursiveKeys,
  getShallowKeys,
  groupValidationErrors,
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
import type { JSONArray, JSONPath } from 'immutable-json-patch'
import { createValueSelection } from './selection.js'
import type { SortedColumn, ValidationError } from '../types.js'
import { SortDirection, ValidationSeverity } from '../types.js'

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
    const columns: JSONPath[] = [['id'], ['name'], ['address', 'city'], ['other']]
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

      deepStrictEqual(toTableCellPosition([], columns), {
        rowIndex: -1,
        columnIndex: -1
      })
    })

    it('toTableCellPosition of a non-flattened, nested item', () => {
      deepStrictEqual(toTableCellPosition(['2', 'other', 'nickname'], columns), {
        rowIndex: 2,
        columnIndex: 3
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
        selectNextColumn(columns, createValueSelection(['2', 'other'], false)),
        createValueSelection(['2', 'other'], false)
      )
    })

    it('stringifyTableCellPosition', () => {
      deepStrictEqual(stringifyTableCellPosition({ rowIndex: 2, columnIndex: 5 }), '2:5')
    })
  })

  describe('groupValidationErrors', () => {
    const columns = [['id'], ['name'], ['address'], ['array']]

    it('should put root errors in root', () => {
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

    it('should put cell errors in the right cell', () => {
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

    it('should put row errors in the row header', () => {
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

    it('should put missing required properties in the right column', () => {
      const error: ValidationError = {
        path: ['3'],
        message: "must have required property 'name'",
        severity: ValidationSeverity.warning
      }

      deepStrictEqual(groupValidationErrors([error], columns), {
        root: [],
        rows: {
          '3': {
            row: [],
            columns: {
              '1': [error]
            }
          }
        }
      })
    })

    it('should put missing nested required properties in the right column', () => {
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

  it('mergeValidationErrors', () => {
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

  it('operationAffectsSortedColumn', () => {
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
})
