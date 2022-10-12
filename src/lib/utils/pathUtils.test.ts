import { deepStrictEqual, notStrictEqual, strictEqual } from 'assert'
import {
  createLodashPropertySelector,
  createMemoizePath,
  createPropertySelector,
  pathToOption,
  stringifyJSONPath,
  stripRootObject
} from './pathUtils.js'

describe('pathUtils', () => {
  it('stringifyJSONPath', () => {
    strictEqual(stringifyJSONPath([]), '$')
    strictEqual(stringifyJSONPath(['']), "$['']")
    strictEqual(stringifyJSONPath(['foo']), '$.foo')
    strictEqual(stringifyJSONPath(['foo', 'bar']), '$.foo.bar')
    strictEqual(stringifyJSONPath(['foo', '2']), '$.foo[2]')
    strictEqual(stringifyJSONPath(['foo', '2', 'bar']), '$.foo[2].bar')
    strictEqual(stringifyJSONPath(['foo', '2', 'bar_baz']), '$.foo[2].bar_baz')
    strictEqual(stringifyJSONPath(['2']), '$[2]')
    strictEqual(stringifyJSONPath(['foo', 'prop-with-hyphens']), "$.foo['prop-with-hyphens']")
    strictEqual(stringifyJSONPath(['foo', 'prop with spaces']), "$.foo['prop with spaces']")
    strictEqual(stringifyJSONPath(['foo', 'prop with \'".[']), "$.foo['prop with '\".[']")
  })

  it('createLodashPropertySelector', () => {
    strictEqual(createLodashPropertySelector([]), "''")
    strictEqual(createLodashPropertySelector(['']), '[""]')
    strictEqual(createLodashPropertySelector(['foo']), "'foo'")
    strictEqual(createLodashPropertySelector(['foo', 'bar']), "'foo.bar'")
    strictEqual(createLodashPropertySelector(['foo', '2']), "'foo[2]'")
    strictEqual(createLodashPropertySelector(['foo', '2', 'bar']), "'foo[2].bar'")
    strictEqual(createLodashPropertySelector(['foo', '2', 'bar baz']), '["foo","2","bar baz"]')
    strictEqual(createLodashPropertySelector(['2']), "'[2]'")
    strictEqual(
      createLodashPropertySelector(['foo', 'prop-with-hyphens']),
      '["foo","prop-with-hyphens"]'
    )
    strictEqual(
      createLodashPropertySelector(['foo', 'prop with spaces']),
      '["foo","prop with spaces"]'
    )
    strictEqual(createLodashPropertySelector(['foo', 'prop with ".[']), '["foo","prop with \\".["]')
  })

  it('stripRootObject', () => {
    strictEqual(stripRootObject('$.foo.bar'), 'foo.bar')
    strictEqual(stripRootObject("$['foo'].bar"), "['foo'].bar")
  })

  it('pathToOption', () => {
    deepStrictEqual(pathToOption([]), { value: [], label: '(whole item)' })
    deepStrictEqual(pathToOption(['users', '2', 'first name']), {
      value: ['users', '2', 'first name'],
      label: "users[2]['first name']"
    })
  })

  it('createPropertySelector', () => {
    strictEqual(createPropertySelector([]), '')
    strictEqual(createPropertySelector(['location', 'latitude']), '?.location?.latitude')
    strictEqual(createPropertySelector(['a', 'b']), '?.a?.b')
    strictEqual(createPropertySelector(['A', 'B']), '?.A?.B')
    strictEqual(createPropertySelector(['prop_$123']), '?.prop_$123')
    strictEqual(createPropertySelector(['Hello World', 'b']), '?.["Hello World"]?.b')
    strictEqual(createPropertySelector(['a', '2']), '?.a?.[2]')
  })

  it('createMemoizePath', () => {
    const memoizePath = createMemoizePath()

    const path1 = ['a', 'b']
    strictEqual(memoizePath(path1), path1)

    const path2 = path1.slice(0)
    strictEqual(memoizePath(path2), path1)

    const memoizePath2 = createMemoizePath()
    const path3 = path1.slice(0)
    strictEqual(memoizePath2(path3), path3) // must NOT be path1, must be isolated from memoizePath

    notStrictEqual(path1, path1.slice(0)) // just to validate that strictEqual works the way I think
  })
})
