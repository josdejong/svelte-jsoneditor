import assert from 'assert'
import { lodashQueryLanguage } from './lodashQueryLanguage.js'
import { cloneDeep } from 'lodash-es'

const { createQuery, executeQuery } = lodashQueryLanguage

const user1 = { _id: '1', user: { name: 'Stuart', age: 6 } }
const user3 = { _id: '3', user: { name: 'Kevin', age: 8 } }
const user2 = { _id: '2', user: { name: 'Bob', age: 7 } }

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
          '  data = data.filter(item => _.get(item, ["user","name"]) == \'Bob\')\n' +
          '  return data\n' +
          '}'
      )

      const result = executeQuery(users, query)
      assert.deepStrictEqual(result, [user2])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original data
    })

    it('should create and execute a filter query for a property with sepcial characters in the name', () => {
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
          '  data = data.filter(item => _.get(item, ["user name!"]) == \'Bob\')\n' +
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
          path: ['user', 'age'],
          direction: 'asc'
        }
      })
      assert.deepStrictEqual(
        query,
        'function query (data) {\n' +
          '  data = _.orderBy(data, [["user","age"]], [\'asc\'])\n' +
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
          '  data = _.orderBy(data, [["user","age"]], [\'desc\'])\n' +
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
          '  data = data.map(item => _.get(item, ["user","name"]))\n' +
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
          '  data = data.map(item => ({\n' +
          '    "name": _.get(item, ["user","name"]),\n' +
          '    "_id": _.get(item, ["_id"])})\n' +
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
          '  data = data.filter(item => _.get(item, ["user","age"]) <= \'7\')\n' +
          '  data = _.orderBy(data, [["user","name"]], [\'asc\'])\n' +
          '  data = data.map(item => _.get(item, ["user","name"]))\n' +
          '  return data\n' +
          '}'
      )

      assert.deepStrictEqual(result, ['Bob', 'Stuart'])
      assert.deepStrictEqual(users, originalUsers) // must not touch the original users
    })
  })
})
