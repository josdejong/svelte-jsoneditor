// benchmark different mechanisms to sort an array using JSONPatch

import assert from 'assert'
import { immutableJSONPatch } from 'immutable-json-patch'
import { sortBy, times } from 'lodash-es'
import {
  fastPatchSort,
  sortOperationsMove,
  sortOperationsMoveAdvanced
} from '../../src/lib/logic/sort.js'

function generateArray(size, changes) {
  const array = times(size).map((item, index) => index)

  for (let i = 0; i < changes; i++) {
    const fromIndex = Math.floor(Math.random() * size)
    const toIndex = Math.floor(Math.random() * size)

    const value = array.splice(fromIndex, 1)[0]
    array.splice(toIndex, 0, value)
  }

  return array
}

function measure(callback) {
  const start = Date.now()
  const result = callback()
  const end = Date.now()
  const duration = end - start

  return [result, duration]
}

function sortBenchmark(size, changes) {
  // TODO: also compare size of patch (KB)
  // TODO: also compare with simply replacing the whole array

  const array = generateArray(size, changes)

  const [operationsSimple, createPatchSimple] = measure(() => sortOperationsMove(array, comparator))
  const [operationsAdvanced, createPatchAdvanced] = measure(() =>
    sortOperationsMoveAdvanced(array, comparator)
  )

  const [sortedSimple, applySimple] = measure(() => immutableJSONPatch(array, operationsSimple))
  const [sortedAdvanced, applyAdvanced] = measure(() =>
    immutableJSONPatch(array, operationsAdvanced)
  )

  const [fastSortedSimple, fastApplySimple] = measure(() => fastPatchSort(array, operationsSimple))
  const [fastSortedAdvanced, fastApplyAdvanced] = measure(() =>
    fastPatchSort(array, operationsAdvanced)
  )

  // validate the results
  const sorted = sortBy(array)
  assert.deepStrictEqual(sortedSimple, sorted)
  assert.deepStrictEqual(sortedAdvanced, sorted)
  assert.deepStrictEqual(fastSortedSimple, sorted)
  assert.deepStrictEqual(fastSortedAdvanced, sorted)

  return {
    size,
    changes,
    operationsSimple: operationsSimple.length,
    operationsAdvanced: operationsAdvanced.length,
    createPatchSimple: createPatchSimple + ' ms',
    createPatchAdvanced: createPatchAdvanced + ' ms',
    applySimple: applySimple + ' ms',
    applyAdvanced: applyAdvanced + ' ms',
    fastApplySimple: fastApplySimple + ' ms',
    fastApplyAdvanced: fastApplyAdvanced + ' ms'
  }
}

const comparator = (a, b) => a - b

const results = [
  sortBenchmark(100, 5),
  sortBenchmark(100, 25),
  sortBenchmark(1e3, 5),
  sortBenchmark(1e3, 1e2),
  sortBenchmark(1e3, 1e3),

  sortBenchmark(1e4, 1e2),
  sortBenchmark(1e4, 1e3)

  // sortBenchmark(1e5, 1e3),
  // sortBenchmark(1e6, 1e3),
  // sortBenchmark(1e6, 1e4),
  // sortBenchmark(1e6, 1e5),
]

console.table(results)
