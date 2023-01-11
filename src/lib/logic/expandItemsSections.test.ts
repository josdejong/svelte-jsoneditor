import { test, describe } from 'vitest'
import assert from 'assert'
import { ARRAY_SECTION_SIZE } from '../constants.js'
import {
  currentRoundNumber,
  getExpandItemsSections,
  mergeSections,
  nextRoundNumber
} from './expandItemsSections.js'

describe('expandItemsSections', () => {
  test('should find the next round number', () => {
    assert.strictEqual(nextRoundNumber(ARRAY_SECTION_SIZE / 2), ARRAY_SECTION_SIZE)
    assert.strictEqual(nextRoundNumber(ARRAY_SECTION_SIZE - 1), ARRAY_SECTION_SIZE)
    assert.strictEqual(nextRoundNumber(ARRAY_SECTION_SIZE), 2 * ARRAY_SECTION_SIZE)
  })

  test('should find the current round number', () => {
    assert.strictEqual(currentRoundNumber(ARRAY_SECTION_SIZE), ARRAY_SECTION_SIZE)
    assert.strictEqual(currentRoundNumber(0), 0)
    assert.strictEqual(currentRoundNumber(0.5 * ARRAY_SECTION_SIZE), 0)
    assert.strictEqual(currentRoundNumber(1.5 * ARRAY_SECTION_SIZE), ARRAY_SECTION_SIZE)
  })

  test('should calculate expandable sections (start, middle, end)', () => {
    assert.deepStrictEqual(getExpandItemsSections(0, 1000), [
      { start: 0, end: 100 },
      { start: 500, end: 600 },
      { start: 900, end: 1000 }
    ])

    assert.deepStrictEqual(getExpandItemsSections(30, 510), [
      { start: 30, end: 100 },
      { start: 200, end: 300 },
      { start: 500, end: 510 }
    ])

    assert.deepStrictEqual(getExpandItemsSections(30, 500), [
      { start: 30, end: 100 },
      { start: 200, end: 300 },
      { start: 400, end: 500 }
    ])

    assert.deepStrictEqual(getExpandItemsSections(30, 410), [
      { start: 30, end: 100 },
      { start: 200, end: 300 },
      { start: 400, end: 410 }
    ])

    assert.deepStrictEqual(getExpandItemsSections(30, 400), [
      { start: 30, end: 100 },
      { start: 200, end: 300 },
      { start: 300, end: 400 }
    ])

    assert.deepStrictEqual(getExpandItemsSections(30, 250), [
      { start: 30, end: 100 },
      { start: 100, end: 200 },
      { start: 200, end: 250 }
    ])

    assert.deepStrictEqual(getExpandItemsSections(30, 200), [
      { start: 30, end: 100 },
      { start: 100, end: 200 }
    ])

    assert.deepStrictEqual(getExpandItemsSections(30, 170), [
      { start: 30, end: 100 },
      { start: 100, end: 170 }
    ])

    assert.deepStrictEqual(getExpandItemsSections(30, 100), [{ start: 30, end: 100 }])

    assert.deepStrictEqual(getExpandItemsSections(30, 70), [{ start: 30, end: 70 }])
  })

  test('should apply expanding a new piece of selection', () => {
    // merge
    assert.deepStrictEqual(
      mergeSections([
        { start: 0, end: 100 },
        { start: 100, end: 200 }
      ]),
      [{ start: 0, end: 200 }]
    )

    // sort correctly
    assert.deepStrictEqual(
      mergeSections([
        { start: 0, end: 100 },
        { start: 400, end: 500 },
        { start: 200, end: 300 }
      ]),
      [
        { start: 0, end: 100 },
        { start: 200, end: 300 },
        { start: 400, end: 500 }
      ]
    )

    // merge partial overlapping
    assert.deepStrictEqual(
      mergeSections([
        { start: 0, end: 30 },
        { start: 20, end: 100 }
      ]),
      [{ start: 0, end: 100 }]
    )

    // merge full overlapping
    assert.deepStrictEqual(
      mergeSections([
        { start: 100, end: 200 },
        { start: 0, end: 300 }
      ]),
      [{ start: 0, end: 300 }]
    )
    assert.deepStrictEqual(
      mergeSections([
        { start: 0, end: 300 },
        { start: 100, end: 200 }
      ]),
      [{ start: 0, end: 300 }]
    )

    // merge overlapping with two
    assert.deepStrictEqual(
      mergeSections([
        { start: 0, end: 100 },
        { start: 200, end: 300 },
        { start: 100, end: 200 }
      ]),
      [{ start: 0, end: 300 }]
    )
  })
})
