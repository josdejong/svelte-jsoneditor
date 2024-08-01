import { test, describe } from 'vitest'
import { createMultiSelection } from './selection.js'
import { onMoveSelection } from './dragging.js'
import type { MoveSelectionResult } from './dragging.js'
import { deepStrictEqual, strictEqual } from 'assert'
import { isEqual } from 'lodash-es'
import type { RenderedItem } from '../types'
import { immutableJSONPatch } from 'immutable-json-patch'

describe('dragging', () => {
  describe('onMoveSelection: array', () => {
    const itemHeight = 18
    const json = {
      array: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    }
    const selection = createMultiSelection(['array', '3'], ['array', '5'])

    const allItems: RenderedItem[] = json.array.map((item, index) => ({
      path: ['array', String(index)],
      height: itemHeight
    }))

    function doMoveSelection({
      deltaY,
      items = allItems
    }: {
      deltaY: number
      items?: RenderedItem[]
    }): MoveSelectionResult {
      return onMoveSelection({
        json,
        selection,
        deltaY,
        items
      })
    }

    test('move down (0 items)', () => {
      const { operations, offset } = doMoveSelection({ deltaY: 0.3 * itemHeight })
      strictEqual(offset, 0)
      deepStrictEqual(operations, undefined)
    })

    test('move down (1 item)', () => {
      const { operations, offset } = doMoveSelection({
        deltaY: 0.75 * itemHeight
      })
      strictEqual(offset, 1)

      deepStrictEqual(operations, [
        { op: 'move', from: '/array/3', path: '/array/6' },
        { op: 'move', from: '/array/3', path: '/array/6' },
        { op: 'move', from: '/array/3', path: '/array/6' }
      ])

      deepStrictEqual(immutableJSONPatch(json, operations), {
        array: [0, 1, 2, 6, 3, 4, 5, 7, 8, 9]
      })
    })

    test('move down (recon with height)', () => {
      const largeItemHeight = 3 * itemHeight
      const items = allItems.map((item) => {
        return isEqual(item.path, ['array', '6'])
          ? { path: item.path, height: largeItemHeight }
          : item
      })

      strictEqual(doMoveSelection({ deltaY: 0.75 * itemHeight, items }).offset, 0)
      strictEqual(doMoveSelection({ deltaY: 2.5 * itemHeight, items }).offset, 1)
    })

    test('move down (2 items)', () => {
      const { operations, offset } = doMoveSelection({ deltaY: 1.7 * itemHeight })
      strictEqual(offset, 2)
      deepStrictEqual(immutableJSONPatch(json, operations || []), {
        array: [0, 1, 2, 6, 7, 3, 4, 5, 8, 9]
      })
    })

    test('move down (to bottom)', () => {
      const { operations, offset } = doMoveSelection({ deltaY: 999 * itemHeight })
      strictEqual(offset, 4)
      deepStrictEqual(immutableJSONPatch(json, operations || []), {
        array: [0, 1, 2, 6, 7, 8, 9, 3, 4, 5]
      })
    })

    test('move up (0 items)', () => {
      const { operations, offset } = doMoveSelection({ deltaY: -0.3 * itemHeight })
      strictEqual(offset, 0)
      deepStrictEqual(operations, undefined)
    })

    test('move up (1 item)', () => {
      const { operations, offset } = doMoveSelection({
        deltaY: -0.7 * itemHeight
      })
      strictEqual(offset, -1)

      deepStrictEqual(operations, [
        { op: 'move', from: '/array/3', path: '/array/2' },
        { op: 'move', from: '/array/4', path: '/array/3' },
        { op: 'move', from: '/array/5', path: '/array/4' }
      ])

      deepStrictEqual(immutableJSONPatch(json, operations), {
        array: [0, 1, 3, 4, 5, 2, 6, 7, 8, 9]
      })
    })

    test('move up (recon with height)', () => {
      const largeItemHeight = 3 * itemHeight
      const items = allItems.map((item) => {
        return isEqual(item.path, ['array', '2'])
          ? { path: item.path, height: largeItemHeight }
          : item
      })

      strictEqual(doMoveSelection({ deltaY: -0.75 * itemHeight, items }).offset, 0)
      strictEqual(doMoveSelection({ deltaY: -2.5 * itemHeight, items }).offset, -1)
    })

    test('move up (2 items)', () => {
      const { operations, offset } = doMoveSelection({ deltaY: -1.7 * itemHeight })
      strictEqual(offset, -2)
      deepStrictEqual(immutableJSONPatch(json, operations || []), {
        array: [0, 3, 4, 5, 1, 2, 6, 7, 8, 9]
      })
    })

    test('move up (to top)', () => {
      const { operations, offset } = doMoveSelection({ deltaY: -999 * itemHeight })
      strictEqual(offset, -3)
      deepStrictEqual(immutableJSONPatch(json, operations || []), {
        array: [3, 4, 5, 0, 1, 2, 6, 7, 8, 9]
      })
    })
  })

  describe('onMoveSelection: object', () => {
    const itemHeight = 18
    const json = {
      object: { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6 }
    }
    const selection = createMultiSelection(['object', 'c'], ['object', 'e'])
    const allItems = Object.keys(json.object).map((key) => ({
      path: ['object', key],
      height: itemHeight
    }))

    function doMoveSelection({
      deltaY,
      items = allItems
    }: {
      deltaY: number
      items?: RenderedItem[]
    }) {
      return onMoveSelection({
        json,
        selection,
        deltaY,
        items
      })
    }

    test('move down (0 items)', () => {
      const { operations, offset } = doMoveSelection({ deltaY: 0.3 * itemHeight })
      strictEqual(offset, 0)
      strictEqual(operations, undefined)
    })

    test('move down (1 item)', () => {
      const { operations, offset } = doMoveSelection({
        deltaY: 0.7 * itemHeight
      })
      strictEqual(offset, 1)
      deepStrictEqual(operations, [
        { op: 'move', from: '/object/c', path: '/object/c' },
        { op: 'move', from: '/object/d', path: '/object/d' },
        { op: 'move', from: '/object/e', path: '/object/e' },
        { op: 'move', from: '/object/g', path: '/object/g' }
      ])
      deepStrictEqual(
        JSON.stringify(immutableJSONPatch(json, operations)),
        JSON.stringify({
          object: { a: 0, b: 1, f: 5, c: 2, d: 3, e: 4, g: 6 }
        })
      )
    })

    test('move down (2 items)', () => {
      const { operations, offset } = doMoveSelection({
        deltaY: 1.7 * itemHeight
      })
      strictEqual(offset, 2)
      deepStrictEqual(
        JSON.stringify(immutableJSONPatch(json, operations || [])),
        JSON.stringify({
          object: { a: 0, b: 1, f: 5, g: 6, c: 2, d: 3, e: 4 }
        })
      )
    })

    test('move down (to bottom)', () => {
      const { operations, offset } = doMoveSelection({
        deltaY: 999 * itemHeight
      })
      strictEqual(offset, 2)
      deepStrictEqual(immutableJSONPatch(json, operations || []), {
        object: { a: 0, b: 1, f: 5, g: 6, c: 2, d: 3, e: 4 }
      })
      deepStrictEqual(
        JSON.stringify(immutableJSONPatch(json, operations || [])),
        JSON.stringify({
          object: { a: 0, b: 1, f: 5, g: 6, c: 2, d: 3, e: 4 }
        })
      )
    })

    test('move up (0 items)', () => {
      const { operations, offset } = doMoveSelection({ deltaY: -0.3 * itemHeight })
      strictEqual(offset, 0)
      strictEqual(operations, undefined)
    })

    test('move up (1 item)', () => {
      const { operations, offset } = doMoveSelection({
        deltaY: -0.7 * itemHeight
      })
      strictEqual(offset, -1)
      deepStrictEqual(operations, [
        { op: 'move', from: '/object/b', path: '/object/b' },
        { op: 'move', from: '/object/f', path: '/object/f' },
        { op: 'move', from: '/object/g', path: '/object/g' }
      ])
      deepStrictEqual(
        JSON.stringify(immutableJSONPatch(json, operations)),
        JSON.stringify({
          object: { a: 0, c: 2, d: 3, e: 4, b: 1, f: 5, g: 6 }
        })
      )
    })

    test('move up (2 items)', () => {
      const { operations, offset } = doMoveSelection({
        deltaY: -1.7 * itemHeight
      })
      strictEqual(offset, -2)
      deepStrictEqual(
        JSON.stringify(immutableJSONPatch(json, operations || [])),
        JSON.stringify({
          object: { c: 2, d: 3, e: 4, a: 0, b: 1, f: 5, g: 6 }
        })
      )
    })

    test('move up (to top)', () => {
      const { operations, offset } = doMoveSelection({
        deltaY: -999 * itemHeight
      })
      strictEqual(offset, -2)
      deepStrictEqual(
        JSON.stringify(immutableJSONPatch(json, operations || [])),
        JSON.stringify({
          object: { c: 2, d: 3, e: 4, a: 0, b: 1, f: 5, g: 6 }
        })
      )
    })
  })
})
