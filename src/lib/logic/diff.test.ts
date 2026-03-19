import { test, describe } from 'vitest'
import assert from 'assert'
import {
  computeJsonDiff,
  computeWordDiff,
  deepEqual,
  getKeyDiffSummary,
  pruneToChanges,
  tokenize
} from './diff.js'

describe('diff', () => {
  describe('computeJsonDiff', () => {
    test('should return no changes for equal JSONs', () => {
      const json = { name: 'Alice', age: 30 }
      const result = computeJsonDiff(json, json)

      assert.strictEqual(result.changeCount, 0)
      assert.strictEqual(result.leftLines.length, result.rightLines.length)
      for (const line of result.leftLines) {
        assert.strictEqual(line.type, 'equal')
      }
      for (const line of result.rightLines) {
        assert.strictEqual(line.type, 'equal')
      }
    })

    test('should detect added keys', () => {
      const left = { name: 'Alice' }
      const right = { name: 'Alice', age: 30 }
      const result = computeJsonDiff(left, right)

      assert.ok(result.changeCount > 0)

      // Right side should have added lines
      const addedRight = result.rightLines.filter((l) => l.type === 'added')
      assert.ok(addedRight.length > 0)
      const addedContent = addedRight.map((l) => l.content).join('\n')
      assert.ok(addedContent.includes('age'))
    })

    test('should detect removed keys', () => {
      const left = { name: 'Alice', age: 30 }
      const right = { name: 'Alice' }
      const result = computeJsonDiff(left, right)

      assert.ok(result.changeCount > 0)

      // Left side should have removed lines
      const removedLeft = result.leftLines.filter((l) => l.type === 'removed')
      assert.ok(removedLeft.length > 0)
      const removedContent = removedLeft.map((l) => l.content).join('\n')
      assert.ok(removedContent.includes('age'))
    })

    test('should detect modified values with word-level diffs', () => {
      const left = { name: 'Alice', score: 100 }
      const right = { name: 'Bob', score: 100 }
      const result = computeJsonDiff(left, right)

      assert.ok(result.changeCount > 0)

      // Should have modified lines
      const modifiedLeft = result.leftLines.filter((l) => l.type === 'modified')
      const modifiedRight = result.rightLines.filter((l) => l.type === 'modified')
      assert.ok(modifiedLeft.length > 0)
      assert.ok(modifiedRight.length > 0)

      // Modified lines should have word diffs
      for (const line of modifiedLeft) {
        assert.ok(line.wordDiffs !== undefined)
        assert.ok(line.wordDiffs!.length > 0)
      }
      for (const line of modifiedRight) {
        assert.ok(line.wordDiffs !== undefined)
        assert.ok(line.wordDiffs!.length > 0)
      }
    })

    test('should align left and right arrays to same length', () => {
      const left = { a: 1 }
      const right = { a: 1, b: 2, c: 3 }
      const result = computeJsonDiff(left, right)

      assert.strictEqual(result.leftLines.length, result.rightLines.length)
    })

    test('should handle empty objects', () => {
      const result = computeJsonDiff({}, {})
      assert.strictEqual(result.changeCount, 0)
      assert.strictEqual(result.leftLines.length, result.rightLines.length)
    })

    test('should handle arrays', () => {
      const left = [1, 2, 3]
      const right = [1, 3, 4]
      const result = computeJsonDiff(left, right)

      assert.ok(result.changeCount > 0)
      assert.strictEqual(result.leftLines.length, result.rightLines.length)
    })

    test('should handle nested objects', () => {
      const left = { user: { name: 'Alice', settings: { theme: 'dark' } } }
      const right = { user: { name: 'Alice', settings: { theme: 'light' } } }
      const result = computeJsonDiff(left, right)

      assert.ok(result.changeCount > 0)

      const modifiedRight = result.rightLines.filter((l) => l.type === 'modified')
      assert.ok(modifiedRight.length > 0)
      const content = modifiedRight.map((l) => l.content).join('')
      assert.ok(content.includes('light'))
    })

    test('should handle completely different JSONs', () => {
      const left = { a: 1 }
      const right = { z: 99, y: 88, x: 77 }
      const result = computeJsonDiff(left, right)

      assert.ok(result.changeCount > 0)
      assert.strictEqual(result.leftLines.length, result.rightLines.length)
    })
  })

  describe('tokenize', () => {
    test('should split on whitespace and JSON punctuation', () => {
      const tokens = tokenize('  "name": "Alice",')
      assert.ok(tokens.length > 1)
      assert.ok(tokens.includes('name'))
      assert.ok(tokens.includes('Alice'))
    })

    test('should handle empty string', () => {
      const tokens = tokenize('')
      assert.strictEqual(tokens.length, 0)
    })
  })

  describe('computeWordDiff', () => {
    test('should detect changed words', () => {
      const leftDiffs = computeWordDiff('  "name": "Alice",', '  "name": "Bob",', 'removed')
      const rightDiffs = computeWordDiff('  "name": "Alice",', '  "name": "Bob",', 'added')

      // Left side should have the removed word "Alice"
      const removedValues = leftDiffs.filter((d) => d.type === 'removed').map((d) => d.value)
      assert.ok(removedValues.some((v) => v.includes('Alice')))

      // Right side should have the added word "Bob"
      const addedValues = rightDiffs.filter((d) => d.type === 'added').map((d) => d.value)
      assert.ok(addedValues.some((v) => v.includes('Bob')))
    })

    test('should return all equal for identical lines', () => {
      const diffs = computeWordDiff('  "name": "Alice"', '  "name": "Alice"', 'removed')
      assert.ok(diffs.every((d) => d.type === 'equal'))
    })
  })

  describe('deepEqual', () => {
    test('should return true for identical primitives', () => {
      assert.ok(deepEqual(1, 1))
      assert.ok(deepEqual('a', 'a'))
      assert.ok(deepEqual(null, null))
      assert.ok(deepEqual(true, true))
    })

    test('should return false for different primitives', () => {
      assert.ok(!deepEqual(1, 2))
      assert.ok(!deepEqual('a', 'b'))
      assert.ok(!deepEqual(null, undefined))
    })

    test('should compare objects deeply', () => {
      assert.ok(deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } }))
      assert.ok(!deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 3 } }))
    })

    test('should compare arrays deeply', () => {
      assert.ok(deepEqual([1, 2, [3]], [1, 2, [3]]))
      assert.ok(!deepEqual([1, 2], [1, 3]))
      assert.ok(!deepEqual([1, 2], [1, 2, 3]))
    })
  })

  describe('pruneToChanges', () => {
    test('should remove unchanged keys', () => {
      const base = { a: 1, b: 2, c: 3 }
      const head = { a: 1, b: 99, c: 3 }
      const [pb, ph] = pruneToChanges(base, head)

      assert.deepStrictEqual(pb, { b: 2 })
      assert.deepStrictEqual(ph, { b: 99 })
    })

    test('should detect added keys', () => {
      const base = { a: 1 }
      const head = { a: 1, b: 2 }
      const [pb, ph] = pruneToChanges(base, head)

      assert.deepStrictEqual(pb, {})
      assert.deepStrictEqual(ph, { b: 2 })
    })

    test('should detect removed keys', () => {
      const base = { a: 1, b: 2 }
      const head = { a: 1 }
      const [pb, ph] = pruneToChanges(base, head)

      assert.deepStrictEqual(pb, { b: 2 })
      assert.deepStrictEqual(ph, {})
    })

    test('should prune id-based arrays to only changed entries', () => {
      const base = {
        items: [
          { id: 1, name: 'sword' },
          { id: 2, name: 'shield' },
          { id: 3, name: 'potion' }
        ]
      }
      const head = {
        items: [
          { id: 1, name: 'sword' },
          { id: 2, name: 'armor' },
          { id: 3, name: 'potion' },
          { id: 4, name: 'bow' }
        ]
      }
      const [pb, ph] = pruneToChanges(base, head)

      // Only id:2 (modified) and id:4 (added) should appear
      assert.deepStrictEqual(pb, { items: [{ id: 2, name: 'shield' }] })
      assert.deepStrictEqual(ph, {
        items: [
          { id: 2, name: 'armor' },
          { id: 4, name: 'bow' }
        ]
      })
    })

    test('should return empty objects when everything is equal', () => {
      const data = { a: 1, b: [1, 2], c: { d: 3 } }
      const [pb, ph] = pruneToChanges(data, data)

      assert.deepStrictEqual(pb, {})
      assert.deepStrictEqual(ph, {})
    })

    test('should handle null/undefined inputs', () => {
      const [pb, ph] = pruneToChanges(null, { a: 1 })
      assert.deepStrictEqual(pb, {})
      assert.deepStrictEqual(ph, { a: 1 })
    })
  })

  describe('getKeyDiffSummary', () => {
    test('should classify keys correctly', () => {
      const base = { a: 1, b: 2, c: 3 }
      const head = { a: 1, b: 99, d: 4 }
      const summary = getKeyDiffSummary(base, head)

      const byKey = Object.fromEntries(summary.map((s) => [s.key, s.status]))
      assert.strictEqual(byKey['a'], 'equal')
      assert.strictEqual(byKey['b'], 'modified')
      assert.strictEqual(byKey['c'], 'removed')
      assert.strictEqual(byKey['d'], 'added')
    })
  })
})
