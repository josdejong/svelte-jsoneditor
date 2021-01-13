import assert from 'assert'
import {
  compareStrings,
  duplicateInText,
  findUniqueName,
  toCapital,
  truncate
} from './stringUtils.js'

describe('stringUtils', () => {
  it('findUniqueName', () => {
    assert.deepStrictEqual(findUniqueName('other', ['a', 'b', 'c']), 'other')
    assert.deepStrictEqual(findUniqueName('b', ['a', 'b', 'c']), 'b (copy)')
    assert.deepStrictEqual(findUniqueName('b', ['a', 'b', 'c', 'b (copy)']), 'b (copy 2)')
    assert.deepStrictEqual(findUniqueName('b (copy)', ['a', 'b', 'c', 'b (copy)']), 'b (copy 2)')
    assert.deepStrictEqual(findUniqueName('b', ['a', 'b', 'c', 'b (copy)', 'b (copy 2)']), 'b (copy 3)')
    assert.deepStrictEqual(findUniqueName('b (copy)', ['a', 'b', 'c', 'b (copy)', 'b (copy 2)']), 'b (copy 3)')
    assert.deepStrictEqual(findUniqueName('b (copy 2)', ['a', 'b', 'c', 'b (copy)', 'b (copy 2)']), 'b (copy 3)')
  })

  it('toCapital', () => {
    assert.deepStrictEqual(toCapital('hello'), 'Hello')
    assert.deepStrictEqual(toCapital('HEllo'), 'Hello')
    assert.deepStrictEqual(toCapital('HEllo'), 'Hello')
    assert.deepStrictEqual(toCapital(''), '')
    assert.deepStrictEqual(toCapital(undefined), undefined)
  })

  it('compareStrings', () => {
    assert.deepStrictEqual(compareStrings('a', 'b'), -1)
    assert.deepStrictEqual(compareStrings('b', 'a'), 1)
    assert.deepStrictEqual(compareStrings('a', 'a'), 0)

    const array = ['b', 'c', 'a']
    assert.deepStrictEqual(array.sort(compareStrings), ['a', 'b', 'c'])
  })

  it('duplicateInText', () => {
    assert.deepStrictEqual(duplicateInText('abcdef', 2, 4), 'abcdcdef')
    assert.deepStrictEqual(duplicateInText('abcdef', 4, 2), 'abcdcdef')
  })

  it('should truncate long text', () => {
    const text = 'Hello world'

    assert.deepStrictEqual(truncate(text, 100), text)
    assert.deepStrictEqual(truncate(text, 11), text)
    assert.deepStrictEqual(truncate(text, 10), 'Hello w...')
    assert.deepStrictEqual(truncate(text, 8), 'Hello...')
  })
})
