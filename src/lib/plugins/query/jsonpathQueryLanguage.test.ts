import { test, describe } from 'vitest'
import assert from 'assert'
import { jsonpathQueryLanguage } from '$lib/plugins/query/jsonpathQueryLanguage'

const { createQuery, executeQuery } = jsonpathQueryLanguage

const user1 = { _id: '1', user: { name: 'Stuart', age: 6, registered: true } }
const user3 = { _id: '3', user: { name: 'Kevin', age: 8, registered: false } }
const user2 = { _id: '2', user: { name: 'Bob', age: 7, registered: true, extra: true } }

const users = [user1, user3, user2]

describe('jsonpathQueryLanguage', () => {
  describe('createQuery and executeQuery', () => {
    test('should create a and execute an empty query', () => {
      const query = createQuery(users, {})
      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(query, '$')
      assert.deepStrictEqual(result, [users])
    })

    test('should create and execute a filter query for a nested property (one match)', () => {
      const query = createQuery(users, {
        filter: {
          path: ['user', 'name'],
          relation: '==',
          value: 'Bob'
        }
      })
      assert.deepStrictEqual(query, '$[?(@.user.name == "Bob")]')

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [user2])
    })

    test('should create and execute a filter query for a nested property (multiple matches)', () => {
      const query = createQuery(users, {
        filter: {
          path: ['user', 'name'],
          relation: '!=',
          value: 'Bob'
        }
      })
      assert.deepStrictEqual(query, '$[?(@.user.name != "Bob")]')

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [user1, user3])
    })

    test('should create and execute a filter query for a property with special characters in the name', () => {
      const data = users.map((item) => ({ "user name'": item.user.name }))

      const query = createQuery(data, {
        filter: {
          path: ["user name'"],
          relation: '==',
          value: 'Bob'
        }
      })
      assert.deepStrictEqual(query, '$[?(@["user name\'"] == "Bob")]')

      const result = executeQuery(data, query, JSON)
      assert.deepStrictEqual(result, [{ "user name'": 'Bob' }])
    })

    test('should create and execute a filter query for the whole array item', () => {
      const data = [2, 3, 1]
      const query = createQuery(data, {
        filter: {
          path: [],
          relation: '==',
          value: '1'
        }
      })
      assert.deepStrictEqual(query, '$[?(@ == 1)]')

      const result = executeQuery(data, query, JSON)
      assert.deepStrictEqual(result, [1])
    })

    test('should create and execute a filter with booleans', () => {
      const query = createQuery(users, {
        filter: {
          path: ['user', 'registered'],
          relation: '==',
          value: 'true'
        }
      })
      assert.deepStrictEqual(query, '$[?(@.user.registered == true)]')

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [user1, user2])
    })

    test('should create and execute a filter with null', () => {
      const query = createQuery(users, {
        filter: {
          path: ['user', 'extra'],
          relation: '!=',
          value: 'null'
        }
      })
      assert.deepStrictEqual(query, '$[?(@.user.extra != null)]')

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [user2])
    })

    test('should throw an error when trying to sort (not supported by JSONPath)', () => {
      assert.throws(() => {
        createQuery(users, {
          sort: {
            path: ['user', 'age'],
            direction: 'asc'
          }
        })
      }, /Sorting is not supported by JSONPath. Please clear the sorting fields/)
    })

    test('should create and execute a project query for a single property', () => {
      const query = createQuery(users, {
        projection: {
          paths: [['user', 'name']]
        }
      })

      assert.deepStrictEqual(query, '$[*].user.name')

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, ['Stuart', 'Kevin', 'Bob'])
    })

    test('should throw an error when creating a project query for a multiple properties', () => {
      assert.throws(() => {
        createQuery(users, {
          projection: {
            paths: [['user', 'name'], ['_id']]
          }
        })
      }, /Error: Picking multiple fields is not supported by JSONPath. Please select only one field/)
    })

    test('should create and execute a query with filter and project', () => {
      const query = createQuery(users, {
        filter: {
          path: ['user', 'age'],
          relation: '<=',
          value: '7'
        },
        projection: {
          paths: [['user', 'name']]
        }
      })

      assert.deepStrictEqual(query, '$[?(@.user.age <= 7)].user.name')

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, ['Stuart', 'Bob'])
    })

    test('should throw an exception when the query is no valid JSONPath expression', () => {
      assert.throws(() => {
        const data = {}
        const query = '@bla bla bla'
        executeQuery(data, query, JSON)
      }, /TypeError: Unknown value type bla bla b/)
    })
  })
})
