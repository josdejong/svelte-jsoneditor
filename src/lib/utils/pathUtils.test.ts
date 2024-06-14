import { describe, test } from 'vitest'
import { deepStrictEqual, strictEqual, throws } from 'assert'
import {
  createLodashPropertySelector,
  createPropertySelector,
  parseJSONPath,
  pathToOption,
  stringifyJSONPath
} from './pathUtils.js'

describe('pathUtils', () => {
  test('stringifyJSONPath', () => {
    strictEqual(stringifyJSONPath([]), '')
    strictEqual(stringifyJSONPath(['']), '[""]')
    strictEqual(stringifyJSONPath(['foo']), 'foo')
    strictEqual(stringifyJSONPath(['foo', 'bar']), 'foo.bar')
    strictEqual(stringifyJSONPath(['foo', '2']), 'foo[2]')
    strictEqual(stringifyJSONPath(['foo', '2', 'bar']), 'foo[2].bar')
    strictEqual(stringifyJSONPath(['foo', '2', 'bar_baz']), 'foo[2].bar_baz')
    strictEqual(stringifyJSONPath(['2']), '[2]')
    strictEqual(stringifyJSONPath(['foo', 'prop-with-hyphens']), 'foo.prop-with-hyphens')
    strictEqual(stringifyJSONPath(['foo', 'prop with spaces']), 'foo.prop with spaces')
    strictEqual(stringifyJSONPath(['foo', 'prop with \'"][']), 'foo["prop with \'\\"]["]')
    strictEqual(stringifyJSONPath(['foo', 'prop with ."']), 'foo["prop with .\\""]')
    strictEqual(stringifyJSONPath(['foo', 'prop with "']), 'foo.prop with "')
  })

  test('parseJSONPath', () => {
    deepStrictEqual(parseJSONPath(''), [])
    deepStrictEqual(parseJSONPath('[""]'), [''])
    deepStrictEqual(parseJSONPath('foo'), ['foo'])
    deepStrictEqual(parseJSONPath('foo.bar'), ['foo', 'bar'])
    deepStrictEqual(parseJSONPath('foo[2]'), ['foo', '2'])
    deepStrictEqual(parseJSONPath('foo[2].bar'), ['foo', '2', 'bar'])
    deepStrictEqual(parseJSONPath('foo[2].bar_baz'), ['foo', '2', 'bar_baz'])
    deepStrictEqual(parseJSONPath('[2]'), ['2'])
    deepStrictEqual(parseJSONPath('foo.prop-with-hyphens'), ['foo', 'prop-with-hyphens'])
    deepStrictEqual(parseJSONPath('["prop.with.dot"]'), ['prop.with.dot'])
    deepStrictEqual(parseJSONPath('["prop with space"]'), ['prop with space'])
    deepStrictEqual(parseJSONPath('["prop with \'\\"]["]'), ['prop with \'"]['])
    deepStrictEqual(parseJSONPath('["prop with \\""]'), ['prop with "'])
    deepStrictEqual(parseJSONPath('\\"'), ['\\"']) // we only unescape when inside a string

    // with initial dot or enclosing whitespace
    deepStrictEqual(parseJSONPath('.foo.bar'), ['foo', 'bar'])
    deepStrictEqual(parseJSONPath('foo.bar'), ['foo', 'bar'])
    deepStrictEqual(parseJSONPath('[2]'), ['2'])
    deepStrictEqual(parseJSONPath(' [2]  '), [' ', '2', '  ']) // This is odd but better than ignoring whitespace in general

    throws(() => {
      parseJSONPath('["hello"wrong quote"]')
    }, /SyntaxError: Invalid JSON path: ] expected at position 8/)
  })

  test('createLodashPropertySelector', () => {
    strictEqual(createLodashPropertySelector([]), '')
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

  test('pathToOption', () => {
    deepStrictEqual(pathToOption([]), { value: [], label: '(item root)' })
    deepStrictEqual(pathToOption(['users', '2', 'first name']), {
      value: ['users', '2', 'first name'],
      label: 'users[2].first name'
    })
  })

  test('createPropertySelector', () => {
    strictEqual(createPropertySelector([]), '')
    strictEqual(createPropertySelector(['location', 'latitude']), '?.location?.latitude')
    strictEqual(createPropertySelector(['a', 'b']), '?.a?.b')
    strictEqual(createPropertySelector(['A', 'B']), '?.A?.B')
    strictEqual(createPropertySelector(['prop_$123']), '?.prop_$123')
    strictEqual(createPropertySelector(['Hello World', 'b']), '?.["Hello World"]?.b')
    strictEqual(createPropertySelector(['a', '2']), '?.a?.[2]')
  })
})
