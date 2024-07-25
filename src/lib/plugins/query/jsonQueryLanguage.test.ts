import { test, describe } from 'vitest'
import assert from 'assert'
import { cloneDeep } from 'lodash-es'
import { LosslessNumber } from 'lossless-json'
import { jsonQueryLanguage } from '$lib/plugins/query/jsonQueryLanguage'

const { createQuery, executeQuery } = jsonQueryLanguage

const user1 = { _id: '1', user: { name: 'Stuart', age: 6, registered: true } }
const user3 = { _id: '3', user: { name: 'Kevin', age: 8, registered: false } }
const user2 = { _id: '2', user: { name: 'Bob', age: 7, registered: true, extra: true } }

const users = [user1, user3, user2]
const originalUsers = cloneDeep([user1, user3, user2])

describe('jsonQueryLanguage', () => {
  describe('createQuery and executeQuery', () => {
    test('should create a and execute an empty query', () => {
      const query = createQuery(users, {})
      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(query, '[\n\n]')
      assert.deepStrictEqual(result, users)
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    test('should create and execute a filter query for a nested property', () => {
      const query = createQuery(users, {
        filter: {
          path: ['user', 'name'],
          relation: '==',
          value: 'Bob'
        }
      })
      assert.deepStrictEqual(query, '["filter", ["user","name"], "==", "Bob"]')

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [user2])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original data
    })

    test('should create and execute a filter query for a property with special characters in the name', () => {
      const data = users.map((item) => ({ 'user name"': item.user.name }))
      const originalData = cloneDeep(data)

      const query = createQuery(data, {
        filter: {
          path: ['user name"'],
          relation: '==',
          value: 'Bob'
        }
      })
      assert.deepStrictEqual(query, '["filter", "user name\\"", "==", "Bob"]')

      const result = executeQuery(data, query, JSON)
      assert.deepStrictEqual(result, [{ 'user name"': 'Bob' }])
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
      assert.deepStrictEqual(query, '["filter", [], "==", 1]')

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
      assert.deepStrictEqual(query, '["filter", ["user","registered"], "==", true]')

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
      assert.deepStrictEqual(query, '["filter", ["user","extra"], "!=", null]')

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
      assert.deepStrictEqual(query, '["sort", ["user","age"]]')

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

      assert.deepStrictEqual(query, '["sort", ["user","age"], "desc"]')

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

      assert.deepStrictEqual(query, '["get", ["user","name"]]')

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

      assert.deepStrictEqual(query, '["pick", ["user","name"], "_id"]')

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

      assert.deepStrictEqual(
        query,
        '[\n' +
          '  ["filter", ["user","age"], "<=", 7],\n' +
          '  ["sort", ["user","name"]],\n' +
          '  ["get", ["user","name"]]\n' +
          ']'
      )

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, ['Bob', 'Stuart'])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    test('should work with alternative parsers and non-native JSON data types', () => {
      const data = [new LosslessNumber('4'), new LosslessNumber('7'), new LosslessNumber('5')]
      const query = createQuery(data, {
        sort: {
          path: [],
          direction: 'asc'
        }
      })

      const result = executeQuery(data, query, JSON)
      assert.deepStrictEqual(result, [
        new LosslessNumber('4'),
        new LosslessNumber('5'),
        new LosslessNumber('7')
      ])
    })

    test('should throw an exception the query is no valid JSON', () => {
      assert.throws(() => {
        const data = {}
        const query = '["filter'
        executeQuery(data, query, JSON)
      }, /SyntaxError: Unterminated string in JSON at position 8/)
    })

    test('should return null when trying to use a non existing function', () => {
      assert.throws(() => {
        const data = {}
        const query = '["foo"]'
        executeQuery(data, query, JSON)
      }, /Error: Unknown query function "foo"/)
    })
  })
})
