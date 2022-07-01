import { createMultiSelection, getEndPath, getStartPath } from './selection.js'
import { documentStatePatch } from './documentState.js'
import { initial, isEqual } from 'lodash-es'
import type { JSONData, JSONPatchDocument } from 'immutable-json-patch'
import { getIn } from 'immutable-json-patch'
import { moveInsideParent } from './operations.js'
import type {
  DocumentState,
  DragInsideAction,
  DragInsideProps,
  MultiSelection,
  RenderedItem,
  JSONSelection
} from '../types'

interface MoveSelectionProps {
  json: JSONData
  documentState: DocumentState
  deltaY: number
  items: RenderedItem[]
}

interface MoveSelectionResult {
  operations: JSONPatchDocument | undefined
  updatedValue: JSONData | undefined
  updatedState: DocumentState | undefined
  updatedSelection: JSONSelection | undefined
  indexOffset: number
}

export function onMoveSelection({
  json,
  documentState,
  deltaY,
  items
}: MoveSelectionProps): MoveSelectionResult {
  const selection = documentState.selection
  const dragInsideAction =
    deltaY < 0
      ? findSwapPathUp({ json, selection, deltaY, items })
      : findSwapPathDown({ json, selection, deltaY, items })

  if (!dragInsideAction || dragInsideAction.indexOffset === 0) {
    return {
      operations: undefined,
      updatedValue: undefined,
      updatedState: undefined,
      updatedSelection: undefined,
      indexOffset: 0
    }
  }

  const operations = moveInsideParent(json, documentState.selection, dragInsideAction)

  // TODO: documentStatePatch is relatively slow for large documents
  //  This is for example noticeable in a large array where we drag a few
  //  properties inside one of the nested objects. In this case we know we do
  //  not need the full document, only the nested changes. So we can optimize
  //  performance here by taking only the relative, nested json and state, and
  //  changing the operations into relative operations.
  const update = documentStatePatch(json, documentState, operations)

  const path = initial(getStartPath(selection))
  const value = getIn(json, path)
  if (Array.isArray(value)) {
    const updatedSelection = createUpdatedArraySelection({
      items,
      json,
      selection,
      indexOffset: dragInsideAction.indexOffset
    })

    return {
      operations,
      updatedValue: getIn(update.json, path),
      updatedState: update.documentState,
      updatedSelection,
      indexOffset: dragInsideAction.indexOffset
    }
  } else {
    // object
    return {
      operations,
      updatedValue: getIn(update.json, path),
      updatedState: undefined,
      updatedSelection: undefined,
      indexOffset: dragInsideAction.indexOffset
    }
  }
}

function findSwapPathUp({
  items,
  selection,
  deltaY
}: DragInsideProps): DragInsideAction | undefined {
  const initialPath = getStartPath(selection)
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

function findSwapPathDown({
  json,
  items,
  selection,
  deltaY
}: DragInsideProps): DragInsideAction | undefined {
  const initialPath = getEndPath(selection)
  const initialIndex = items.findIndex((item) => isEqual(item.path, initialPath))

  let cumulativeHeight = 0
  let index = initialIndex

  const nextHeight = () => items[index + 1]?.height

  while (nextHeight() !== undefined && Math.abs(deltaY) > cumulativeHeight + nextHeight() / 2) {
    cumulativeHeight += nextHeight()
    index += 1
  }

  const parentPath = initial(initialPath)
  const parent = getIn(json, parentPath)
  const isArray = Array.isArray(parent)
  const beforeIndex = isArray ? index : index + 1
  const beforePath = items[beforeIndex]?.path
  const indexOffset = index - initialIndex

  return beforePath ? { beforePath, indexOffset } : { append: true, indexOffset }
}

interface UpdatedArraySelectionProps {
  items: RenderedItem[]
  json: JSONData
  selection: JSONSelection
  indexOffset: number
}

function createUpdatedArraySelection({
  items,
  json,
  selection,
  indexOffset
}: UpdatedArraySelectionProps): MultiSelection {
  const startPath = getStartPath(selection)
  const endPath = getEndPath(selection)

  const startIndex = items.findIndex((item) => isEqual(item.path, startPath))
  const endIndex = items.findIndex((item) => isEqual(item.path, endPath))

  const anchorPath = items[startIndex + indexOffset]?.path
  const focusPath = items[endIndex + indexOffset]?.path

  return createMultiSelection(json, anchorPath, focusPath)
}
