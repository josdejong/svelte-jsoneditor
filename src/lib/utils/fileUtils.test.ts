import { test, describe } from 'vitest'
import assert from 'assert'
import { formatSize } from './fileUtils.js'

describe('fileUtils', () => {
  test('should format a document size in a human readable way', () => {
    assert.strictEqual(formatSize(500), '500 B')
    assert.strictEqual(formatSize(900), '0.9 KB')
    assert.strictEqual(formatSize(77.89 * 1000), '77.9 KB')
    assert.strictEqual(formatSize(950 * 1000), '0.9 MB')
    assert.strictEqual(formatSize(7.22 * 1000 * 1000), '7.2 MB')
    assert.strictEqual(formatSize(945.4 * 1000 * 1000), '0.9 GB')
    assert.strictEqual(formatSize(22.37 * 1000 * 1000 * 1000), '22.4 GB')
    assert.strictEqual(formatSize(1000 * 1000 * 1000 * 1000), '1.0 TB')
  })

  test('should format a document size in a human readable way counting with 1024', () => {
    assert.strictEqual(formatSize(1024 * 1024, 1024), '1.0 MB')
  })
})
