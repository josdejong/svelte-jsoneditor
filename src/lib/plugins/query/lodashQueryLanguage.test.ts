import assert from 'assert'
import { lodashQueryLanguage } from './lodashQueryLanguage.js'
import { cloneDeep } from 'lodash-es'

const { createQuery, executeQuery } = lodashQueryLanguage

const user1 = { _id: '1', user: { name: 'Stuart', age: 6, registered: true } }
const user3 = { _id: '3', user: { name: 'Kevin', age: 8, registered: false } }
const user2 = { _id: '2', user: { name: 'Bob', age: 7, registered: true, extra: true } }

const users = [user1, user3, user2]
const originalUsers = cloneDeep([user1, user3, user2])

describe('lodashQueryLanguage', () => {
  describe('createQuery and executeQuery', () => {
    it('should create a and execute an empty query', () => {
      const query = createQuery(users, {})
      const result = executeQuery(users, query)
      assert.deepStrictEqual(query, 'function query (data) {\n  return data\n}')
      assert.deepStrictEqual(result, users)
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    it('should create and execute a filter query for a nested property', () => {
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
          "  data = _.filter(data, item => item?.user?.name == 'Bob')\n" +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(users, query)
      assert.deepStrictEqual(result, [user2])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original data
    })

    it('should create and execute a filter query for a property with special characters in the name', () => {
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
          '  data = _.filter(data, item => item?.["user name!"] == \'Bob\')\n' +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(data, query)
      assert.deepStrictEqual(result, [{ 'user name!': 'Bob' }])
      assert.deepStrictEqual(data, originalData) // must not touch the original data
    })

    it('should create and execute a filter query for the whole array item', () => {
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
          '  data = _.filter(data, item => item == 1)\n' +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(data, query)
      assert.deepStrictEqual(result, [1])
      assert.deepStrictEqual(data, originalData) // must not touch the original data
    })

    it('should create and execute a filter with booleans', () => {
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
          '  data = _.filter(data, item => item?.user?.registered == true)\n' +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(users, query)
      assert.deepStrictEqual(result, [user1, user2])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    it('should create and execute a filter with null', () => {
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
          '  data = _.filter(data, item => item?.user?.extra != null)\n' +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(users, query)
      assert.deepStrictEqual(result, [user2])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    it('should create and execute a filter with undefined', () => {
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
          '  data = _.filter(data, item => item?.user?.extra != undefined)\n' +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(users, query)
      assert.deepStrictEqual(result, [user2])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    it('should create and execute a sort query in ascending direction', () => {
      const query = createQuery(users, {
        sort: {
          path: ['user', 'age'],
          direction: 'asc'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          "  data = _.orderBy(data, ['user.age'], ['asc'])\n" +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(users, query)
      assert.deepStrictEqual(result, [user1, user2, user3])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    it('should create and execute a sort query in descending direction', () => {
      const query = createQuery(users, {
        sort: {
          path: ['user', 'age'],
          direction: 'desc'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          "  data = _.orderBy(data, ['user.age'], ['desc'])\n" +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(users, query)
      assert.deepStrictEqual(result, [user3, user2, user1])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    it('should create and execute a project query for a single property', () => {
      const query = createQuery(users, {
        projection: {
          paths: [['user', 'name']]
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  data = _.map(data, item => item?.user?.name)\n' +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(users, query)
      assert.deepStrictEqual(result, ['Stuart', 'Kevin', 'Bob'])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    it('should create and execute a project query for a multiple properties', () => {
      const query = createQuery(users, {
        projection: {
          paths: [['user', 'name'], ['_id']]
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  data = _.map(data, item => ({\n' +
          '    "name": item?.user?.name,\n' +
          '    "_id": item?._id\n' +
          '  }))\n' +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(users, query)
      assert.deepStrictEqual(result, [
        { name: 'Stuart', _id: '1' },
        { name: 'Kevin', _id: '3' },
        { name: 'Bob', _id: '2' }
      ])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    it('should create and execute a query with filter, sort and project', () => {
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
      const result = executeQuery(users, query)

      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  data = _.filter(data, item => item?.user?.age <= 7)\n' +
          "  data = _.orderBy(data, ['user.name'], ['asc'])\n" +
          '  data = _.map(data, item => item?.user?.name)\n' +
          '  return data\n' +
          '}'
      )

      assert.deepStrictEqual(result, ['Bob', 'Stuart'])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    it('should allow defining multiple functions', () => {
      const query =
        'function square(x) {\n' +
        '  return x*x;\n' +
        '};\n' +
        'function query(data) {\n' +
        '  return square(data)\n' +
        '};'
      const data = 4
      const result = executeQuery(data, query)
      assert.deepStrictEqual(result, 16)
    })

    it('should throw an exception when function query is not defined in the query', () => {
      assert.throws(() => {
        const query = 'function test (data) { return 42 }'
        const data = {}

        executeQuery(data, query)
      }, /Error: Cannot execute query: expecting a function named 'query' but is undefined/)
    })

    it('should return null when property is not found', () => {
      const query = 'function query (data) {\n' + '  return data.foo\n' + '}'
      const data = {}
      const result = executeQuery(data, query)
      assert.deepStrictEqual(result, null)
    })
  })
})
