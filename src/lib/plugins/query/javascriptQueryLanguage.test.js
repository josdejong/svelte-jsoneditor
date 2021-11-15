import assert from 'assert'
import { javascriptQueryLanguage } from './javascriptQueryLanguage.js'
import { cloneDeep } from 'lodash-es'

const { createQuery, executeQuery } = javascriptQueryLanguage

const user1 = { _id: '1', user: { name: 'Stuart', age: 6 } }
const user3 = { _id: '3', user: { name: 'Kevin', age: 8 } }
const user2 = { _id: '2', user: { name: 'Bob', age: 7 } }

const users = [user1, user3, user2]
const originalUsers = cloneDeep([user1, user3, user2])

describe('javascriptQueryLanguage', () => {
  describe('createQuery and executeQuery', () => {
    it('should create a and execute an empty query', () => {
      const query = createQuery(users, {})
      const result = executeQuery(users, query)
      assert.deepStrictEqual(query, 'function query (data) {\n  return data\n}')
      assert.deepStrictEqual(result, users)
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })

    it('should create and execute a filter query for a nested property', () => {
      const query = createQuery(users, {
        filter: {
          field: ['user', 'name'],
          relation: '==',
          value: 'Bob'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  data = data.filter(item => item?.["user"]?.["name"] == \'Bob\')\n' +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(users, query)
      assert.deepStrictEqual(result, [user2])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original data
    })

    it('should create and execute a filter query for a property with spaces in the name', () => {
      const data = users.map((item) => ({ 'user name': item.user.name }))
      const originalData = cloneDeep(data)

      const query = createQuery(data, {
        filter: {
          field: ['user name'],
          relation: '==',
          value: 'Bob'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  data = data.filter(item => item?.["user name"] == \'Bob\')\n' +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(data, query)
      assert.deepStrictEqual(result, [{ 'user name': 'Bob' }])
      assert.deepStrictEqual(data, originalData) // must not touch the original data
    })

    it('should create and execute a filter query for the whole array item', () => {
      const data = [2, 3, 1]
      const originalData = cloneDeep(data)
      const query = createQuery(data, {
        filter: {
          field: [],
          relation: '==',
          value: '1'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          "  data = data.filter(item => item == '1')\n" +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(data, query)
      assert.deepStrictEqual(result, [1])
      assert.deepStrictEqual(data, originalData) // must not touch the original data
    })

    it('should create and execute a sort query in ascending direction', () => {
      const query = createQuery(users, {
        sort: {
          field: ['user', 'age'],
          direction: 'asc'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  data = data.slice().sort((a, b) => {\n' +
          '    // sort ascending\n' +
          '    const valueA = a?.["user"]?.["age"]\n' +
          '    const valueB = b?.["user"]?.["age"]\n' +
          '    return valueA > valueB ? 1 : valueA < valueB ? -1 : 0\n' +
          '  })\n' +
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
          field: ['user', 'age'],
          direction: 'desc'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  data = data.slice().sort((a, b) => {\n' +
          '    // sort descending\n' +
          '    const valueA = a?.["user"]?.["age"]\n' +
          '    const valueB = b?.["user"]?.["age"]\n' +
          '    return valueA > valueB ? -1 : valueA < valueB ? 1 : 0\n' +
          '  })\n' +
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
          fields: [['user', 'name']]
        }
      })

      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  data = data.map(item => item?.["user"]?.["name"])\n' +
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
          fields: [['user', 'name'], ['_id']]
        }
      })

      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  data = data.map(item => ({\n' +
          '    "name": item?.["user"]?.["name"],\n' +
          '    "_id": item?.["_id"]})\n' +
          '  )\n' +
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
          field: ['user', 'age'],
          relation: '<=',
          value: '7'
        },
        sort: {
          field: ['user', 'name'],
          direction: 'asc'
        },
        projection: {
          fields: [['user', 'name']]
        }
      })

      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  data = data.filter(item => item?.["user"]?.["age"] <= \'7\')\n' +
          '  data = data.slice().sort((a, b) => {\n' +
          '    // sort ascending\n' +
          '    const valueA = a?.["user"]?.["name"]\n' +
          '    const valueB = b?.["user"]?.["name"]\n' +
          '    return valueA > valueB ? 1 : valueA < valueB ? -1 : 0\n' +
          '  })\n' +
          '  data = data.map(item => item?.["user"]?.["name"])\n' +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(users, query)
      assert.deepStrictEqual(result, ['Bob', 'Stuart'])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })
  })
})
