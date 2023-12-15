import assert from 'assert'
import { describe, test } from 'vitest'
import { jmespathQueryLanguage } from './jmespathQueryLanguage.js'
import { cloneDeep } from 'lodash-es'
import { LosslessNumber, parse, stringify } from 'lossless-json'

const { createQuery, executeQuery } = jmespathQueryLanguage

describe('jmespathQueryLanguage', () => {
  describe('createQuery and executeQuery', () => {
    const user1 = { _id: '1', user: { name: 'Stuart', age: 6, registered: true } }
    const user3 = { _id: '3', user: { name: 'Kevin', age: 8, registered: false } }
    const user2 = { _id: '2', user: { name: 'Bob', age: 7, registered: true, extra: true } }

    const users = [user1, user3, user2]
    const originalUsers = cloneDeep([user1, user3, user2])

    test('should create a and execute an empty query', () => {
      const query = createQuery(users, {})
      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(query, '[*]')
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
      assert.deepStrictEqual(query, '[? user.name == `"Bob"`]')

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, [user2])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original data
    })

    test('should create and execute a filter query for a property with sepcial characters in the name', () => {
      const data = users.map((item) => ({ 'user name!': item.user.name }))
      const originalData = cloneDeep(data)

      const query = createQuery(data, {
        filter: {
          path: ['user name!'],
          relation: '==',
          value: 'Bob'
        }
      })
      assert.deepStrictEqual(query, '[? "user name!" == `"Bob"`]')

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
      assert.deepStrictEqual(query, '[? @ == `1`]')

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
      assert.deepStrictEqual(query, '[? user.registered == `true`]')

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
      assert.deepStrictEqual(query, '[? user.extra != `null`]')

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
      assert.deepStrictEqual(query, '[*] | sort_by(@, &user.age)')

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
      assert.deepStrictEqual(query, '[*] | reverse(sort_by(@, &user.age))')

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
      assert.deepStrictEqual(query, '[*].user.name')

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
      assert.deepStrictEqual(query, '[*].{name: user.name, _id: _id}')

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
      assert.deepStrictEqual(query, '[? user.age <= `7`] | sort_by(@, &user.name) | [*].user.name')

      const result = executeQuery(users, query, JSON)
      assert.deepStrictEqual(result, ['Bob', 'Stuart'])

      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })
  })

  test('should correctly escape and quote sort and projection fields', () => {
    const item42 = {
      id: 42,
      nested: {
        'complex "field" \'name\'': 42
      }
    }
    const item0 = {
      id: 0,
      nested: {
        'complex "field" \'name\'': 0
      }
    }
    const json = [item42, item0]
    const query = createQuery(json, {
      sort: {
        path: ['nested', 'complex "field" \'name\''],
        direction: 'asc'
      },
      projection: {
        paths: [['id'], ['nested', 'complex "field" \'name\'']]
      }
    })

    assert.deepStrictEqual(
      query,
      '[*] ' +
        '| sort_by(@, &nested."complex \\"field\\" \'name\'") ' +
        '| [*].{id: id, "complex \\"field\\" \'name\'": nested."complex \\"field\\" \'name\'"}'
    )

    const result = executeQuery(json, query, JSON)

    assert.deepStrictEqual(result, [
      { id: 0, 'complex "field" \'name\'': 0 },
      { id: 42, 'complex "field" \'name\'': 42 }
    ])
  })

  test('should return null when property is not found', () => {
    const query = '@.foo'
    const data = {}
    const result = executeQuery(data, query, JSON)
    assert.deepStrictEqual(result, null)
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

    // JMESPath does not support LosslessNumber, and executeQuery will convert into numbers first
    const result = executeQuery(data, query, LosslessJSONParser)
    assert.deepStrictEqual(result, [4, 5, 7])
  })
})
