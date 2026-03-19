import { test, describe } from 'vitest'
import assert from 'assert'
import { computeJsonDiff, computeWordDiff, tokenize } from './diff.js'

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
})
