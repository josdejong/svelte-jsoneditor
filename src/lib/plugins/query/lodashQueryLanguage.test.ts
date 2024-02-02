import { describe, test } from 'vitest'
import assert from 'assert'
import { lodashQueryLanguage } from './lodashQueryLanguage.js'
import { cloneDeep } from 'lodash-es'
import { LosslessNumber, parse, stringify } from 'lossless-json'

const { createQuery, executeQuery } = lodashQueryLanguage

const user1 = { _id: '1', user: { name: 'Stuart', age: 6, registered: true } }
const user3 = { _id: '3', user: { name: 'Kevin', age: 8, registered: false } }
const user2 = { _id: '2', user: { name: 'Bob', age: 7, registered: true, extra: true } }

const users = [user1, user3, user2]
const originalUsers = cloneDeep([user1, user3, user2])

describe('lodashQueryLanguage', () => {
  describe('createQuery and executeQuery', () => {
    test('should create a and execute an empty query', () => {
      const query = createQuery(users, {})
      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(
        query,
        'function query (data) {\n  return _.chain(data)\n    .value()\n}'
      )
      assert.deepStrictEqual(result, users)
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    test('should create and execute a filter query for a nested property', () => {
      const query = createQuery(
        {},
        {
          filter: {
            path: ['user', 'name'],
            relation: '==',
            value: 'Bob'
          }
        }
      )
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  return _.chain(data)\n' +
          "    .filter(item => item?.user?.name == 'Bob')\n" +
          '    .value()\n' +
          '}'
      )

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [user2])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original data
    })

    test('should create and execute a filter query for a property with special characters in the name', () => {
      const data = users.map((item) => ({ 'user name!': item.user.name }))
      const originalData = cloneDeep(data)

      const query = createQuery(data, {
        filter: {
          path: ['user name!'],
          relation: '==',
          value: 'Bob'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  return _.chain(data)\n' +
          '    .filter(item => item?.["user name!"] == \'Bob\')\n' +
          '    .value()\n' +
          '}'
      )

      const result = executeQuery(data, query, JSON)
      assert.deepStrictEqual(result, [{ 'user name!': 'Bob' }])
      assert.deepStrictEqual(data, originalData) // must not touch the original data
    })

    test('should create and execute a filter query for the whole array item', () => {
      const data = [2, 3, 1]
      const originalData = cloneDeep(data)
      const query = createQuery(data, {
        filter: {
          path: [],
          relation: '==',
          value: '1'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  return _.chain(data)\n' +
          '    .filter(item => item == 1)\n' +
          '    .value()\n' +
          '}'
      )

      const result = executeQuery(data, query, JSON)
      assert.deepStrictEqual(result, [1])
      assert.deepStrictEqual(data, originalData) // must not touch the original data
    })

    test('should create and execute a filter with booleans', () => {
      const query = createQuery(users, {
        filter: {
          path: ['user', 'registered'],
          relation: '==',
          value: 'true'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  return _.chain(data)\n' +
          '    .filter(item => item?.user?.registered == true)\n' +
          '    .value()\n' +
          '}'
      )

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [user1, user2])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    test('should create and execute a filter with null', () => {
      const query = createQuery(users, {
        filter: {
          path: ['user', 'extra'],
          relation: '!=',
          value: 'null'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  return _.chain(data)\n' +
          '    .filter(item => item?.user?.extra != null)\n' +
          '    .value()\n' +
          '}'
      )

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [user2])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    test('should create and execute a filter with undefined', () => {
      const query = createQuery(users, {
        filter: {
          path: ['user', 'extra'],
          relation: '!=',
          value: 'undefined'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  return _.chain(data)\n' +
          '    .filter(item => item?.user?.extra != undefined)\n' +
          '    .value()\n' +
          '}'
      )

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [user2])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    test('should create and execute a sort query in ascending direction', () => {
      const query = createQuery(users, {
        sort: {
          path: ['user', 'age'],
          direction: 'asc'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  return _.chain(data)\n' +
          "    .orderBy(['user.age'], ['asc'])\n" +
          '    .value()\n' +
          '}'
      )

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [user1, user2, user3])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    test('should create and execute a sort query in descending direction', () => {
      const query = createQuery(users, {
        sort: {
          path: ['user', 'age'],
          direction: 'desc'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  return _.chain(data)\n' +
          "    .orderBy(['user.age'], ['desc'])\n" +
          '    .value()\n' +
          '}'
      )

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [user3, user2, user1])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    test('should create and execute a project query for a single property', () => {
      const query = createQuery(users, {
        projection: {
          paths: [['user', 'name']]
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  return _.chain(data)\n' +
          '    .map(item => item?.user?.name)\n' +
          '    .value()\n' +
          '}'
      )

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, ['Stuart', 'Kevin', 'Bob'])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    test('should create and execute a project query for a multiple properties', () => {
      const query = createQuery(users, {
        projection: {
          paths: [['user', 'name'], ['_id']]
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  return _.chain(data)\n' +
          '    .map(item => ({\n' +
          '      "name": item?.user?.name,\n' +
          '      "_id": item?._id\n' +
          '    }))\n' +
          '    .value()\n' +
          '}'
      )

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [
        { name: 'Stuart', _id: '1' },
        { name: 'Kevin', _id: '3' },
        { name: 'Bob', _id: '2' }
      ])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    test('should create and execute a query with filter, sort and project', () => {
      const query = createQuery(users, {
        filter: {
          path: ['user', 'age'],
          relation: '<=',
          value: '7'
        },
        sort: {
          path: ['user', 'name'],
          direction: 'asc'
        },
        projection: {
          paths: [['user', 'name']]
        }
      })
      const result = executeQuery(users, query, JSON)

      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  return _.chain(data)\n' +
          '    .filter(item => item?.user?.age <= 7)\n' +
          "    .orderBy(['user.name'], ['asc'])\n" +
          '    .map(item => item?.user?.name)\n' +
          '    .value()\n' +
          '}'
      )

      assert.deepStrictEqual(result, ['Bob', 'Stuart'])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    test('should correctly escape and quote orderBy', () => {
      const item42 = {
        nested: {
          'complex "field" \'name\'': 42
        }
      }
      const item0 = {
        nested: {
          'complex "field" \'name\'': 0
        }
      }
      const json = [item42, item0]
      const query = createQuery(json, {
        sort: {
          path: ['nested', 'complex "field" \'name\''],
          direction: 'asc'
        }
      })

      const result = executeQuery(json, query, JSON)

      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  return _.chain(data)\n' +
          '    .orderBy([["nested","complex \\"field\\" \'name\'"]], [\'asc\'])\n' +
          '    .value()\n' +
          '}'
      )

      assert.deepStrictEqual(result, [item0, item42])
    })

    test('should allow defining multiple functions', () => {
      const query =
        'function square(x) {\n' +
        '  return x*x;\n' +
        '};\n' +
        'function query(data) {\n' +
        '  return square(data)\n' +
        '};'
      const data = 4
      const result = executeQuery(data, query, JSON)
      assert.deepStrictEqual(result, 16)
    })

    test('should sort a list with numbers', () => {
      const data = [4, 7, 5]
      const query = createQuery(data, {
        sort: {
          path: [],
          direction: 'asc'
        }
      })

      const result = executeQuery(data, query, JSON)
      assert.deepStrictEqual(result, [4, 5, 7])
    })

    test('should sort empty keys by value', () => {
      const data = [{ '': 4 }, { '': 7 }, { '': 5 }]
      const query = createQuery(data, {
        sort: {
          path: [''],
          direction: 'asc'
        }
      })

      const result = executeQuery(data, query, JSON)
      assert.deepStrictEqual(result, [{ '': 4 }, { '': 5 }, { '': 7 }])
    })

    test('should work with alternative parsers and non-native JSON data types', () => {
      const LosslessJSONParser = { parse, stringify }

      const data = [new LosslessNumber('4'), new LosslessNumber('7'), new LosslessNumber('5')]
      const query = createQuery(data, {
        sort: {
          path: [],
          direction: 'asc'
        }
      })

      const result = executeQuery(data, query, LosslessJSONParser)
      assert.deepStrictEqual(result, [
        new LosslessNumber('4'),
        new LosslessNumber('5'),
        new LosslessNumber('7')
      ])
    })

    test('should throw an exception when function query is not defined in the query', () => {
      assert.throws(() => {
        const query = 'function test (data) { return 42 }'
        const data = {}

        executeQuery(data, query, JSON)
      }, /Error: Cannot execute query: expecting a function named 'query' but is undefined/)
    })

    test('should throw an exception when query contains a lodash chain without .value()', () => {
      assert.throws(() => {
        executeQuery([], 'function query (data) { return _.chain(data) }', JSON)
      }, /Error: Cannot execute query: Lodash _\.chain\(\.\.\.\) must end with \.value\(\)/)

      assert.throws(() => {
        executeQuery(
          [],
          'function query (data) { return _.chain(data).map(item => 2 * item) }',
          JSON
        )
      }, /Error: Cannot execute query: Lodash _\.chain\(\.\.\.\) must end with \.value\(\)/)
    })

    test('should return null when property is not found', () => {
      const query = 'function query (data) {\n' + '  return data.foo\n' + '}'
      const data = {}
      const result = executeQuery(data, query, JSON)
      assert.deepStrictEqual(result, null)
    })
  })
})
