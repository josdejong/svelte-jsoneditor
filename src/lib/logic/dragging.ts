import { createMultiSelection, createSelectionMap, getEndPath, getStartPath } from './selection.js'
import { documentStatePatch } from './documentState.js'
import { initial, isEqual, last } from 'lodash-es'
import type { JSONPath } from 'immutable-json-patch'
import { compileJSONPointer, getIn } from 'immutable-json-patch'
import { moveInsideParent } from './operations.js'
import type {
  DocumentState,
  DragInsideAction,
  DragInsideProps,
  JSONData,
  JSONPatchDocument,
  MultiSelection,
  RenderedItem,
  Selection
} from '../types'

interface MoveSelectionProps {
  fullJson: JSONData
  documentState: DocumentState
  deltaY: number
  items: RenderedItem[]
}

interface MoveSelectionResult {
  operations: JSONPatchDocument | undefined
  updatedValue: JSONData | undefined
  updatedSelection: Selection | undefined
  updatedFullSelection: Selection | undefined
  indexOffset: number
}

export function onMoveSelection({
  fullJson,
  documentState,
  deltaY,
  items
}: MoveSelectionProps): MoveSelectionResult {
  const fullSelection = documentState.selection
  const dragInsideAction =
    deltaY < 0
      ? findSwapPathUp({ fullSelection, deltaY, items })
      : findSwapPathDown({ fullSelection, deltaY, items })

  if (!dragInsideAction || dragInsideAction.indexOffset === 0) {
    return {
      operations: undefined,
      updatedValue: undefined,
      updatedSelection: undefined,
      updatedFullSelection: undefined,
      indexOffset: 0
    }
  }

  const operations = moveInsideParent(fullJson, documentState.selection, dragInsideAction)

  // TODO: documentStatePatch is relatively slow for large documents
  //  This is for example noticeable in a large array where we drag a few
  //  properties inside one of the nested objects. In this case we know we do
  //  not need the full document, only the nested changes. So we can optimize
  //  performance here by taking only the relative, nested json and state, and
  //  changing the operations into relative operations.
  const update = documentStatePatch(fullJson, documentState, operations)

  const path: JSONPath = initial(getStartPath(fullSelection)) as JSONPath
  const pointer = compileJSONPointer(path)
  const value = getIn(fullJson, path)
  if (Array.isArray(value)) {
    const updatedFullSelection = createUpdatedArraySelection({
      items,
      fullJson,
      fullSelection,
      indexOffset: dragInsideAction.indexOffset
    })

    const updatedSelectionMap = createSelectionMap(updatedFullSelection)
    const updatedSelection = updatedSelectionMap[pointer]

    return {
      operations,
      updatedValue: getIn(update.json, path) as JSONData,
      updatedSelection,
      updatedFullSelection: updatedFullSelection,
      indexOffset: dragInsideAction.indexOffset
    }
  } else {
    // object
    return {
      operations,
      updatedValue: getIn(update.json, path) as JSONData,
      updatedSelection: undefined,
      updatedFullSelection: undefined,
      indexOffset: dragInsideAction.indexOffset
    }
  }
}

function findSwapPathUp({
  items,
  fullSelection,
  deltaY
}: DragInsideProps): DragInsideAction | undefined {
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

function findSwapPathDown({
  items,
  fullSelection,
  deltaY
}: DragInsideProps): DragInsideAction | undefined {
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

interface UpdatedArraySelectionProps {
  items: RenderedItem[]
  fullJson: JSONData
  fullSelection: Selection
  indexOffset: number
}

function createUpdatedArraySelection({
  items,
  fullJson,
  fullSelection,
  indexOffset
}: UpdatedArraySelectionProps): MultiSelection {
  const startPath = getStartPath(fullSelection)
  const endPath = getEndPath(fullSelection)

  const startIndex = items.findIndex((item) => isEqual(item.path, startPath))
  const endIndex = items.findIndex((item) => isEqual(item.path, endPath))

  const anchorPath = items[startIndex + indexOffset]?.path
  const focusPath = items[endIndex + indexOffset]?.path

  return createMultiSelection(fullJson, anchorPath, focusPath)
}
