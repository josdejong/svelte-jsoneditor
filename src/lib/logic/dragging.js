import {
  createRecursiveSelection,
  createSelection,
  getEndPath,
  getStartPath,
  SELECTION_TYPE
} from './selection.js'
import { documentStatePatch } from './documentState.js'
import { first, initial, isEqual, last } from 'lodash-es'
import { getIn } from 'immutable-json-patch'
import { moveInsideParent } from './operations.js'

/**
 * Test whether all paths in the selection are rendered, which is the
 * case when they are all in the visible, rendered items
 * @param {Selection} selection
 * @param {RenderedItem[]} items
 * @return {boolean}
 */
export function fullSelectionVisible(selection, items) {
  // the paths in the selection are ordered from top to bottom
  // the items too. We utilize this
  const selectionPaths = selection.paths || [selection.focusPath]

  const firstSelectionPath = first(selectionPaths)
  const offset = items.findIndex((item) => isEqual(item.path, firstSelectionPath))

  if (offset === -1) {
    return false
  }

  return selectionPaths.every((selectionPath, index) => {
    const itemPath = items[index + offset]?.path

    return isEqual(selectionPath, itemPath)
  })
}

/**
 * @param {JSON} fullJson
 * @param {JSON} fullState
 * @param {Selection} fullSelection
 * @param {number} deltaY
 * @param {RenderedItem[]} items
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
export function onMoveSelection({ fullJson, fullState, fullSelection, deltaY, items }) {
  const dragInsideAction =
    deltaY < 0
      ? findSwapPathUp({ fullSelection, deltaY, items })
      : findSwapPathDown({ fullSelection, deltaY, items })

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

  // TODO: documentStatePatch is relatively slow for large documents
  //  This is for example noticeable in a large array where we drag a few
  //  properties inside one of the nested objects. In this case we know we do
  //  not need the full document, only the nested changes. So we can optimize
  //  performance here by taking only the relative, nested json and state, and
  //  changing the operations into relative operations.
  const update = documentStatePatch(fullJson, fullState, operations)

  const path = initial(getStartPath(fullSelection))
  const value = getIn(fullJson, path)
  if (Array.isArray(value)) {
    const updatedFullSelection = createUpdatedArraySelection({
      items,
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
function findSwapPathUp({ items, fullSelection, deltaY }) {
  const initialPath = getStartPath(fullSelection)
  const initialIndex = items.findIndex((item) => isEqual(item.path, initialPath))

  const prevHeight = () => items[index - 1]?.height

  let index = initialIndex
  let cumulativeHeight = 0

  while (prevHeight() !== undefined && Math.abs(deltaY) > cumulativeHeight + prevHeight() / 2) {
    cumulativeHeight += prevHeight()
    index -= 1
  }

  const beforePath = items[index].path
  const indexOffset = index - initialIndex

  return index !== initialIndex && items[index] !== undefined
    ? { beforePath, indexOffset }
    : undefined
}

/**
 * @param {DragInsideProps} props
 * @returns {DragInsideAction | undefined}
 */
function findSwapPathDown({ items, fullSelection, deltaY }) {
  const initialPath = getEndPath(fullSelection)
  const initialIndex = items.findIndex((item) => isEqual(item.path, initialPath))

  const nextHeight = () => items[index + 1]?.height

  let cumulativeHeight = 0
  let index = initialIndex

  while (nextHeight() !== undefined && Math.abs(deltaY) > cumulativeHeight + nextHeight() / 2) {
    cumulativeHeight += nextHeight()
    index += 1
  }

  const isArray = typeof last(initialPath) === 'number'
  const beforeIndex = isArray ? index : index + 1
  const beforePath = items[beforeIndex]?.path
  const indexOffset = index - initialIndex

  return beforePath ? { beforePath, indexOffset } : { append: true, indexOffset }
}

/**
 * @param {RenderedItem[]} items
 * @param {JSON} fullJson
 * @param {JSON} fullState
 * @param {Selection} fullSelection
 * @param {number} indexOffset
 * @returns {Selection}
 */
function createUpdatedArraySelection({ items, fullJson, fullState, fullSelection, indexOffset }) {
  const startPath = getStartPath(fullSelection)
  const endPath = getEndPath(fullSelection)

  const startIndex = items.findIndex((item) => isEqual(item.path, startPath))
  const endIndex = items.findIndex((item) => isEqual(item.path, endPath))

  const anchorPath = items[startIndex + indexOffset]?.path
  const focusPath = items[endIndex + indexOffset]?.path

  return createSelection(fullJson, fullState, {
    type: SELECTION_TYPE.MULTI,
    anchorPath,
    focusPath
  })
}
