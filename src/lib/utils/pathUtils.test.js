import { notStrictEqual, strictEqual } from 'assert'
import { createMemoizePath, createPropertySelector, stringifyPath } from './pathUtils.js'

describe('pathUtils', () => {
  it('stringifyPath', () => {
    strictEqual(stringifyPath([]), '')
    strictEqual(stringifyPath(['']), '[""]')
    strictEqual(stringifyPath(['foo']), '.foo')
    strictEqual(stringifyPath(['foo', 'bar']), '.foo.bar')
    strictEqual(stringifyPath(['foo', 2]), '.foo[2]')
    strictEqual(stringifyPath(['foo', 2, 'bar']), '.foo[2].bar')
    strictEqual(stringifyPath(['foo', 2, 'bar_baz']), '.foo[2].bar_baz')
    strictEqual(stringifyPath([2]), '[2]')
    strictEqual(stringifyPath(['foo', 'prop-with-hyphens']), '.foo["prop-with-hyphens"]')
    strictEqual(stringifyPath(['foo', 'prop with spaces']), '.foo["prop with spaces"]')
  })

  it('createPropertySelector', () => {
    strictEqual(createPropertySelector([]), '')
    strictEqual(createPropertySelector(['location', 'latitude']), '?.location?.latitude')
    strictEqual(createPropertySelector(['a', 'b']), '?.a?.b')
    strictEqual(createPropertySelector(['A', 'B']), '?.A?.B')
    strictEqual(createPropertySelector(['prop_$123']), '?.prop_$123')
    strictEqual(createPropertySelector(['Hello World', 'b']), '?.["Hello World"]?.b')
    strictEqual(createPropertySelector(['a', 2]), '?.a?.[2]')
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
