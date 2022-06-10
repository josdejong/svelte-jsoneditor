import { deepStrictEqual, strictEqual } from 'assert'
import { traverse } from './objectUtils.js'

describe('objectUtils', () => {
  it('traverse', () => {
    const json = {
      a: [1, 2],
      b: {
        c: 3,
        d: 4
      },
      e: 5
    }
    const logs = []

    traverse(json, (value, path, context) => {
      strictEqual(context, json)
      logs.push({ value, path: path.slice() })
    })

    deepStrictEqual(logs, [
      { value: json, path: [] },
      { value: json.a, path: ['a'] },
      { value: json.a[0], path: ['a', 0] },
      { value: json.a[1], path: ['a', 1] },
      { value: json.b, path: ['b'] },
      { value: json.b.c, path: ['b', 'c'] },
      { value: json.b.d, path: ['b', 'd'] },
      { value: json.e, path: ['e'] }
    ])
  })
})
