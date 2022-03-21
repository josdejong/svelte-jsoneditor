import {
  createRecursiveSelection,
  createSelection,
  getEndPath,
  getStartPath,
  SELECTION_TYPE
} from './selection.js'
import { documentStatePatch, getNextPathInside, getPreviousPathInside } from './documentState.js'
import { initial, last } from 'lodash-es'
import { getIn } from 'immutable-json-patch'
import { moveInsideParent } from './operations.js'

/**
 * @param {JSON} fullJson
 * @param {JSON} fullState
 * @param {Selection} fullSelection
 * @param {number} deltaY
 * @param {Object<string, number>} heights
 *
 * @returns {Object}
 * @property {JSONPatchDocument | undefined} operations
 * @property {JSON | undefined} updatedValue
 * @property {JSON | undefined} updatedState
 * @property {RecursiveSelection | undefined} updatedSelection
 * @property {Selection | undefined} updatedFullSelection
 * @property {number} indexOffset
 */
// TODO: write unit tests for onMoveSelection
export function onMoveSelection({ fullJson, fullState, fullSelection, deltaY, heights }) {
  // TODO: refactor this function, it's a mess. idea: upfront, create an array with the key/index of every child and it's height. Just loop over that array instead of getPreviousPathInside

  const dragInsideAction =
    deltaY < 0
      ? findSwapPathUp({ fullJson, fullState, fullSelection, deltaY, heights })
      : findSwapPathDown({ fullJson, fullState, fullSelection, deltaY, heights })

  if (!dragInsideAction) {
    return {
      operations: undefined,
      updatedValue: undefined,
      updatedState: undefined,
      updatedSelection: undefined,
      updatedFullSelection: undefined,
      indexOffset: 0
    }
  }

  const operations = moveInsideParent(fullJson, fullState, fullSelection, dragInsideAction)
  const update = documentStatePatch(fullJson, fullState, operations)

  const path = initial(getStartPath(fullSelection))
  const value = getIn(fullJson, path)
  if (Array.isArray(value)) {
    const updatedFullSelection = createUpdatedArraySelection({
      fullJson,
      fullState,
      fullSelection,
      indexOffset: dragInsideAction.indexOffset
    })

    const recursiveSelection = createRecursiveSelection(fullJson, updatedFullSelection)
    const updatedRecursiveSelection = getIn(recursiveSelection, path)

    return {
      operations,
      updatedValue: getIn(update.json, path),
      updatedState: getIn(update.state, path),
      updatedSelection: updatedRecursiveSelection,
      updatedFullSelection: updatedFullSelection,
      indexOffset: dragInsideAction.indexOffset
    }
  } else {
    // object
    return {
      operations,
      updatedValue: getIn(update.json, path),
      updatedState: getIn(update.state, path),
      updatedSelection: undefined,
      updatedFullSelection: undefined,
      indexOffset: dragInsideAction.indexOffset
    }
  }
}

/**
 * @param {DragInsideProps} props
 * @returns {DragInsideAction | undefined}
 */
function findSwapPathUp({ fullJson, fullState, fullSelection, deltaY, heights }) {
  // TODO: simplify this function
  const initialPath = getStartPath(fullSelection)

  let path = getPreviousPathInside(fullJson, fullState, initialPath)
  let height = heights[last(path)]
  let cumulativeHeight = 0
  let indexOffset = 0
  let swapPath = undefined

  while (height !== undefined && Math.abs(deltaY) > cumulativeHeight + height / 2) {
    cumulativeHeight += height
    indexOffset -= 1
    swapPath = path

    path = getPreviousPathInside(fullJson, fullState, path)
    height = heights[last(path)]
  }

  return swapPath ? { beforePath: swapPath, indexOffset } : undefined
}

/**
 * @param {DragInsideProps} props
 * @returns {DragInsideAction | undefined}
 */
function findSwapPathDown({ fullJson, fullState, fullSelection, deltaY, heights }) {
  // TODO: simplify this function
  const initialPath = getEndPath(fullSelection)
  const parentPath = initial(initialPath)

  let nextPath = getNextPathInside(fullJson, fullState, initialPath)
  let nextHeight = heights[last(nextPath)]
  let cumulativeHeight = 0
  let indexOffset = 0
  let swapPath = undefined

  while (nextHeight !== undefined && Math.abs(deltaY) > cumulativeHeight + nextHeight / 2) {
    cumulativeHeight += nextHeight
    indexOffset += 1
    swapPath = nextPath

    nextPath = getNextPathInside(fullJson, fullState, nextPath)
    nextHeight = heights[last(nextPath)]
  }

  if (!swapPath) {
    return undefined
  }

  const beforePath = getNextPathInside(fullJson, fullState, swapPath)
  const value = getIn(fullJson, parentPath)

  return Array.isArray(value)
    ? { beforePath: swapPath, indexOffset }
    : beforePath
    ? { beforePath, indexOffset }
    : { append: true, indexOffset }
}

/**
 * @param fullJson
 * @param fullState
 * @param fullSelection
 * @param indexOffset
 * @returns {Selection}
 */
function createUpdatedArraySelection({ fullJson, fullState, fullSelection, indexOffset }) {
  // This function assumes we do have a selection of items in an Array
  const path = initial(getStartPath(fullSelection))
  const startIndex = last(getStartPath(fullSelection))
  const endIndex = last(getEndPath(fullSelection))

  return createSelection(fullJson, fullState, {
    type: SELECTION_TYPE.MULTI,
    anchorPath: path.concat(startIndex + indexOffset),
    focusPath: path.concat(endIndex + indexOffset)
  })
}
