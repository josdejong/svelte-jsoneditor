import { createMultiSelection } from './selection.js'
import { createExpandedDocumentState, syncState } from './documentState.js'
import { onMoveSelection } from './dragging.js'
import { deepStrictEqual, strictEqual } from 'assert'
import { isEqual } from 'lodash-es'

describe('dragging', () => {
  describe('onMoveSelection: array', () => {
    const itemHeight = 18
    const fullJson = {
      array: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    }
    const fullState = syncState(fullJson, undefined, [], () => true)
    const documentState = createExpandedDocumentState(fullJson, () => true)
    const allItems = fullJson.array.map((item, index) => ({
      path: ['array', index],
      height: itemHeight
    }))

    const fullSelection = createMultiSelection(fullJson, documentState, ['array', 3], ['array', 5])

    function doMoveSelection({ deltaY, items = allItems }) {
      return onMoveSelection({
        fullJson,
        fullState,
        fullSelection,
        documentState,
        deltaY,
        items
      })
    }

    it('move down (0 items)', () => {
      const { operations, indexOffset } = doMoveSelection({ deltaY: 0.3 * itemHeight })
      strictEqual(indexOffset, 0)
      deepStrictEqual(operations, undefined)
    })

    it('move down (1 item)', () => {
      const { operations, indexOffset, updatedValue } = doMoveSelection({
        deltaY: 0.75 * itemHeight
      })
      strictEqual(indexOffset, 1)

      deepStrictEqual(operations, [
        { op: 'move', from: '/array/3', path: '/array/6' },
        { op: 'move', from: '/array/3', path: '/array/6' },
        { op: 'move', from: '/array/3', path: '/array/6' }
      ])

      deepStrictEqual(updatedValue, [0, 1, 2, 6, 3, 4, 5, 7, 8, 9])
    })

    it('move down (recon with height)', () => {
      const largeItemHeight = 3 * itemHeight
      const items = allItems.map((item) => {
        return isEqual(item.path, ['array', 6])
          ? { path: item.path, height: largeItemHeight }
          : item
      })

      strictEqual(doMoveSelection({ deltaY: 0.75 * itemHeight, items }).indexOffset, 0)
      strictEqual(doMoveSelection({ deltaY: 2.5 * itemHeight, items }).indexOffset, 1)
    })

    it('move down (2 items)', () => {
      const { indexOffset, updatedValue } = doMoveSelection({ deltaY: 1.7 * itemHeight })
      strictEqual(indexOffset, 2)
      deepStrictEqual(updatedValue, [0, 1, 2, 6, 7, 3, 4, 5, 8, 9])
    })

    it('move down (to bottom)', () => {
      const { indexOffset, updatedValue } = doMoveSelection({ deltaY: 999 * itemHeight })
      strictEqual(indexOffset, 4)
      deepStrictEqual(updatedValue, [0, 1, 2, 6, 7, 8, 9, 3, 4, 5])
    })

    it('move up (0 items)', () => {
      const { operations, indexOffset } = doMoveSelection({ deltaY: -0.3 * itemHeight })
      strictEqual(indexOffset, 0)
      deepStrictEqual(operations, undefined)
    })

    it('move up (1 item)', () => {
      const { operations, indexOffset, updatedValue } = doMoveSelection({
        deltaY: -0.7 * itemHeight
      })
      strictEqual(indexOffset, -1)

      deepStrictEqual(operations, [
        { op: 'move', from: '/array/3', path: '/array/2' },
        { op: 'move', from: '/array/4', path: '/array/3' },
        { op: 'move', from: '/array/5', path: '/array/4' }
      ])

      deepStrictEqual(updatedValue, [0, 1, 3, 4, 5, 2, 6, 7, 8, 9])
    })

    it('move up (recon with height)', () => {
      const largeItemHeight = 3 * itemHeight
      const items = allItems.map((item) => {
        return isEqual(item.path, ['array', 2])
          ? { path: item.path, height: largeItemHeight }
          : item
      })

      strictEqual(doMoveSelection({ deltaY: -0.75 * itemHeight, items }).indexOffset, 0)
      strictEqual(doMoveSelection({ deltaY: -2.5 * itemHeight, items }).indexOffset, -1)
    })

    it('move up (2 items)', () => {
      const { indexOffset, updatedValue } = doMoveSelection({ deltaY: -1.7 * itemHeight })
      strictEqual(indexOffset, -2)
      deepStrictEqual(updatedValue, [0, 3, 4, 5, 1, 2, 6, 7, 8, 9])
    })

    it('move up (to top)', () => {
      const { indexOffset, updatedValue } = doMoveSelection({ deltaY: -999 * itemHeight })
      strictEqual(indexOffset, -3)
      deepStrictEqual(updatedValue, [3, 4, 5, 0, 1, 2, 6, 7, 8, 9])
    })
  })

  describe('onMoveSelection: object', () => {
    const itemHeight = 18
    const fullJson = {
      object: { a: 0, b: 1, c: 2, d: 3, e: 4, f: 5, g: 6 }
    }
    const fullState = syncState(fullJson, undefined, [], () => true)
    const documentState = createExpandedDocumentState(fullJson, () => true)
    const allItems = Object.keys(fullJson.object).map((key) => ({
      path: ['object', key],
      height: itemHeight
    }))

    const fullSelection = createMultiSelection(
      fullJson,
      documentState,
      ['object', 'c'],
      ['object', 'e']
    )

    function doMoveSelection({ deltaY, items = allItems }) {
      return onMoveSelection({
        fullJson,
        fullState,
        documentState,
        fullSelection,
        deltaY,
        items
      })
    }

    it('move down (0 items)', () => {
      const { indexOffset, operations } = doMoveSelection({ deltaY: 0.3 * itemHeight })
      strictEqual(indexOffset, 0)
      strictEqual(operations, undefined)
    })

    it('move down (1 item)', () => {
      const { indexOffset, operations, updatedValue } = doMoveSelection({
        deltaY: 0.7 * itemHeight
      })
      strictEqual(indexOffset, 1)
      deepStrictEqual(operations, [
        { op: 'move', from: '/object/c', path: '/object/c' },
        { op: 'move', from: '/object/d', path: '/object/d' },
        { op: 'move', from: '/object/e', path: '/object/e' },
        { op: 'move', from: '/object/g', path: '/object/g' }
      ])
      deepStrictEqual(
        JSON.stringify(updatedValue),
        JSON.stringify({ a: 0, b: 1, f: 5, c: 2, d: 3, e: 4, g: 6 })
      )
    })

    it('move down (2 items)', () => {
      const { indexOffset, updatedValue } = doMoveSelection({
        deltaY: 1.7 * itemHeight
      })
      strictEqual(indexOffset, 2)
      deepStrictEqual(
        JSON.stringify(updatedValue),
        JSON.stringify({ a: 0, b: 1, f: 5, g: 6, c: 2, d: 3, e: 4 })
      )
    })

    it('move down (to bottom)', () => {
      const { indexOffset, updatedValue } = doMoveSelection({
        deltaY: 999 * itemHeight
      })
      strictEqual(indexOffset, 2)
      deepStrictEqual(updatedValue, { a: 0, b: 1, f: 5, g: 6, c: 2, d: 3, e: 4 })
      deepStrictEqual(
        JSON.stringify(updatedValue),
        JSON.stringify({ a: 0, b: 1, f: 5, g: 6, c: 2, d: 3, e: 4 })
      )
    })

    it('move up (0 items)', () => {
      const { indexOffset, operations } = doMoveSelection({ deltaY: -0.3 * itemHeight })
      strictEqual(indexOffset, 0)
      strictEqual(operations, undefined)
    })

    it('move up (1 item)', () => {
      const { indexOffset, operations, updatedValue } = doMoveSelection({
        deltaY: -0.7 * itemHeight
      })
      strictEqual(indexOffset, -1)
      deepStrictEqual(operations, [
        { op: 'move', from: '/object/b', path: '/object/b' },
        { op: 'move', from: '/object/f', path: '/object/f' },
        { op: 'move', from: '/object/g', path: '/object/g' }
      ])
      deepStrictEqual(
        JSON.stringify(updatedValue),
        JSON.stringify({ a: 0, c: 2, d: 3, e: 4, b: 1, f: 5, g: 6 })
      )
    })

    it('move up (2 items)', () => {
      const { indexOffset, updatedValue } = doMoveSelection({
        deltaY: -1.7 * itemHeight
      })
      strictEqual(indexOffset, -2)
      deepStrictEqual(
        JSON.stringify(updatedValue),
        JSON.stringify({ c: 2, d: 3, e: 4, a: 0, b: 1, f: 5, g: 6 })
      )
    })

    it('move up (to top)', () => {
      const { indexOffset, updatedValue } = doMoveSelection({
        deltaY: -999 * itemHeight
      })
      strictEqual(indexOffset, -2)
      deepStrictEqual(
        JSON.stringify(updatedValue),
        JSON.stringify({ c: 2, d: 3, e: 4, a: 0, b: 1, f: 5, g: 6 })
      )
    })
  })
})
