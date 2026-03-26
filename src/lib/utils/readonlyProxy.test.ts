import { describe, expect, test } from 'vitest'
import { readonlyProxy } from '$lib/utils/readonlyProxy.js'

describe('readonlyProxy', () => {
  const objOriginal = createNestedObject()
  const obj = createNestedObject()
  const proxy = readonlyProxy(obj)

  test('should read a nested property', () => {
    // @ts-expect-error
    expect(proxy[0].data.value).toEqual(42)
  })

  test('should allow invoking immutable methods', () => {
    // @ts-expect-error
    expect(proxy.map((item) => item.id)).toEqual([1, 2])

    // @ts-expect-error
    expect(proxy.find((item) => item.id === 1)).toEqual(obj[0])

    const log: unknown[] = []
    // @ts-expect-error
    proxy.forEach((value, index) => log.push({ value, index }))
    expect(log).toEqual([
      { value: obj[0], index: 0 },
      { value: obj[1], index: 1 }
    ])
  })

  test('should get all object keys', () => {
    // @ts-expect-error
    expect(Object.keys(proxy[0])).toEqual(['id', 'data'])
  })

  test('should not allow setting a nested property', () => {
    // @ts-expect-error
    expect(() => (proxy[0].data.value = 'foo')).toThrow(
      new TypeError("'set' on proxy: trap returned falsish for property 'value'")
    )

    // @ts-expect-error
    expect(() => (proxy[0].data = 'foo')).toThrow(
      new TypeError("'set' on proxy: trap returned falsish for property 'data'")
    )

    // @ts-expect-error
    expect(() => (proxy[0] = null)).toThrow(
      new TypeError("'set' on proxy: trap returned falsish for property '0'")
    )

    expect(obj).toEqual(objOriginal)
  })

  test('should not allow deleting a property', () => {
    // @ts-expect-error
    expect(() => delete proxy[0].data.value).toThrow(
      new TypeError("'deleteProperty' on proxy: trap returned falsish for property 'value'")
    )

    // @ts-expect-error
    expect(() => delete proxy[0]).toThrow(
      new TypeError("'deleteProperty' on proxy: trap returned falsish for property '0'")
    )

    expect(obj).toEqual(objOriginal)
  })

  test('should not allow mutable array methods', () => {
    // @ts-expect-error
    expect(() => proxy.splice(2)).toThrow(
      new TypeError("'set' on proxy: trap returned falsish for property 'length'")
    )

    expect(obj).toEqual(objOriginal)
  })

  test('should not proxy primitives', () => {
    expect(readonlyProxy(true)).toEqual(true)
    expect(readonlyProxy(42)).toEqual(42)
    expect(readonlyProxy('foo')).toEqual('foo')
    expect(readonlyProxy(undefined)).toEqual(undefined)
  })
})

function createNestedObject() {
  return [
    { id: 1, data: { value: 42 } },
    { id: 2, data: { value: 48 } }
  ]
}
