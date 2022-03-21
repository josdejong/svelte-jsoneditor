import {
  createRecursiveSelection,
  createSelection,
  getEndPath,
  getStartPath,
  SELECTION_TYPE
} from './selection.js'
import { documentStatePatch, getNextPathInside, getPreviousPathInside } from './documentState.js'
import { last } from 'lodash-es'
import { getIn } from 'immutable-json-patch'
import { moveInsideParent } from './operations.js'

/**
 * @param {Object} props
 * @property {JSON} fullJson
 * @property {JSON} fullState
 * @property {Selection} fullSelection
 * @property {JSON} value
 * @property {JSON} state
 * @property {Selection} selection
 * @property {Path} path
 * @property {number} deltaY
 * @property {Object<string, number>} heights
 *
 * @returns {Object}
 * @property {null | JSONPatchDocument} operations
 * @property {JSON} value
 * @property {JSON} json
 * @property {Selection} selection
 * @property {number} offset
 */
// TODO: write unit tests for onMoveSelection
export function onMoveSelection({
  fullJson,
  fullState,
  fullSelection,
  value,
  state,
  selection,
  path,
  deltaY,
  heights
}) {
  // TODO: remove the need to pass value, state, selection
  // TODO: refactor this function, it's a mess. idea: upfront, create an array with the key/index of every child and it's height. Just loop over that array instead of getPreviousPathInside

  if (!fullSelection) {
    return { operations: null, value, state, selection, offset: 0 }
  }

  /**
   * @returns {DragInsideAction | undefined}
   */
  function findSwapPathUp() {
    // TODO: simplify this function
    const initialPath = getStartPath(fullSelection)

    let path = getPreviousPathInside(fullJson, fullState, initialPath)
    let height = heights[last(path)]
    let cumulativeHeight = 0
    let offset = 0
    let swapPath = undefined

    while (height !== undefined && Math.abs(deltaY) > cumulativeHeight + height / 2) {
      cumulativeHeight += height
      offset -= 1
      swapPath = path

      path = getPreviousPathInside(fullJson, fullState, path)
      height = heights[last(path)]
    }

    return swapPath ? { beforePath: swapPath, offset } : undefined
  }

  /**
   * @returns {DragInsideAction | undefined}
   */
  function findSwapPathDown() {
    // TODO: simplify this function
    const initialPath = getEndPath(fullSelection)

    let path = getNextPathInside(fullJson, fullState, initialPath)
    let height = heights[last(path)]
    let cumulativeHeight = 0
    let offset = 0
    let swapPath = undefined

    while (height !== undefined && Math.abs(deltaY) > cumulativeHeight + height / 2) {
      cumulativeHeight += height
      offset += 1
      swapPath = path

      path = getNextPathInside(fullJson, fullState, path)
      height = heights[last(path)]
    }

    if (!swapPath) {
      return undefined
    }

    const beforePath = getNextPathInside(fullJson, fullState, swapPath)

    return Array.isArray(value)
      ? { beforePath: swapPath, offset }
      : beforePath
      ? { beforePath, offset }
      : { append: true, offset }
  }

  function createUpdatedArraySelection(offset) {
    // FIXME: this function is hacky, refactor this
    const startIndex = last(getStartPath(fullSelection))
    const endIndex = last(getEndPath(fullSelection))

    const updatedFullSelection = createSelection(fullJson, fullState, {
      type: SELECTION_TYPE.MULTI,
      anchorPath: path.concat(startIndex + offset),
      focusPath: path.concat(endIndex + offset)
    })

    const recursiveSelection = createRecursiveSelection(fullJson, updatedFullSelection)
    const updatedSelection = getIn(recursiveSelection, path)

    return { updatedSelection, updatedFullSelection }
  }

  const dragInsideAction = deltaY < 0 ? findSwapPathUp() : findSwapPathDown()
  if (dragInsideAction) {
    const operations = moveInsideParent(fullJson, fullState, fullSelection, dragInsideAction)
    const update = documentStatePatch(fullJson, fullState, operations)

    if (Array.isArray(value)) {
      const { updatedSelection, updatedFullSelection } = createUpdatedArraySelection(
        dragInsideAction.offset
      )

      return {
        operations,
        value: getIn(update.json, path),
        state: getIn(update.state, path),
        selection: updatedSelection,
        fullSelection: updatedFullSelection,
        offset: dragInsideAction.offset
      }
    } else {
      return {
        operations,
        value: getIn(update.json, path),
        state: getIn(update.state, path),
        selection,
        fullSelection,
        offset: dragInsideAction.offset
      }
    }
  } else {
    return { operations: null, value, state, selection, fullSelection, offset: 0 }
  }
}
