import { createSelection, SELECTION_TYPE } from './selection.js'
import { syncState } from './documentState.js'
import { fullSelectionVisible } from './dragging.js'
import { strictEqual } from 'assert'

describe('dragging', () => {
  describe('fullSelectionVisible: array', () => {
    const json = {
      array: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    }
    const state = syncState(json, undefined, [], () => true)
    const allItems = json.array.map((item, index) => ({ path: ['array', index], height: 18 }))
    const partialItems = [...allItems.slice(0, 4), ...allItems.slice(7)]

    const selection = createSelection(json, state, {
      type: SELECTION_TYPE.MULTI,
      anchorPath: ['array', 3],
      focusPath: ['array', 8]
    })

    it('should calculate fullSelectionVisible in an array', () => {
      strictEqual(fullSelectionVisible(selection, allItems), true)
    })

    it('should calculate fullSelectionVisible in a partially invisible array', () => {
      strictEqual(fullSelectionVisible(selection, partialItems), false)
    })
  })

  describe('fullSelectionVisible: object', () => {
    const json = {
      object: {
        a: 0,
        b: 1,
        c: 2,
        d: 3,
        e: 4,
        f: 5,
        g: 6
      }
    }
    const state = syncState(json, undefined, [], () => true)
    const allItems = Object.keys(json.object).map((key) => ({ path: ['object', key], height: 18 }))

    const selection = createSelection(json, state, {
      type: SELECTION_TYPE.MULTI,
      anchorPath: ['object', 'c'],
      focusPath: ['object', 'e']
    })

    it('should calculate fullSelectionVisible in an object', () => {
      strictEqual(fullSelectionVisible(selection, allItems), true)
    })
  })
})
