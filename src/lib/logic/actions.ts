import {
  createEditKeySelection,
  createEditValueSelection,
  createInsideSelection,
  createMultiSelection,
  createValueSelection,
  getFocusPath,
  hasSelectionContents,
  isKeySelection,
  isValueSelection,
  selectionToPartialJson
} from '$lib/logic/selection.js'
import copyToClipboard from '$lib/utils/copyToClipboard.js'
import {
  append,
  createNewValue,
  createRemoveOperations,
  duplicate,
  insert,
  insertBefore,
  removeAll
} from '$lib/logic/operations.js'
import type {
  AfterPatchCallback,
  InsertType,
  JSONParser,
  JSONSelection,
  OnChange,
  OnChangeText,
  OnJSONSelect,
  OnPatch
} from '$lib/types'
import { createDebug } from '$lib/utils/debug.js'
import {
  getIn,
  isJSONObject,
  isJSONPatchAdd,
  isJSONPatchReplace,
  type JSONPath,
  parsePath
} from 'immutable-json-patch'
import { isObject, isObjectOrArray } from '$lib/utils/typeUtils.js'
import { expandAll, expandNone, expandPath, expandSmart } from '$lib/logic/documentState.js'
import { initial, isEmpty, last } from 'lodash-es'
import { fromTableCellPosition, toTableCellPosition } from '$lib/logic/table.js'

const debug = createDebug('jsoneditor:actions')

export interface OnCutAction {
  json: unknown | undefined
  selection: JSONSelection | undefined
  indentation: string | number | undefined
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
}

// TODO: write unit tests
export async function onCut({
  json,
  selection,
  indentation,
  readOnly,
  parser,
  onPatch
}: OnCutAction) {
  if (readOnly || json === undefined || !selection || !hasSelectionContents(selection)) {
    return
  }

  const clipboard = selectionToPartialJson(json, selection, indentation, parser)
  if (clipboard === undefined) {
    return
  }

  debug('cut', { selection, clipboard, indentation })

  await copyToClipboard(clipboard)

  const { operations, newSelection } = createRemoveOperations(json, selection)

  onPatch(operations, (_, patchedState) => ({
    state: patchedState,
    selection: newSelection
  }))
}

export interface OnCopyAction {
  json: unknown
  selection: JSONSelection | undefined
  indentation: string | number | undefined
  parser: JSONParser
}

// TODO: write unit tests
export async function onCopy({ json, selection, indentation, parser }: OnCopyAction) {
  const clipboard = selectionToPartialJson(json, selection, indentation, parser)
  if (clipboard === undefined) {
    return
  }

  debug('copy', { clipboard, indentation })

  await copyToClipboard(clipboard)
}

type RepairModalCallback = (text: string, onApply: (repairedText: string) => void) => void

interface OnPasteAction {
  clipboardText: string
  json: unknown | undefined
  selection: JSONSelection | undefined
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
  onChangeText: OnChangeText
  openRepairModal: RepairModalCallback
}

// TODO: write unit tests
export function onPaste({
  clipboardText,
  json,
  selection,
  readOnly,
  parser,
  onPatch,
  onChangeText,
  openRepairModal
}: OnPasteAction) {
  if (readOnly) {
    return
  }

  function doPaste(pastedText: string) {
    if (json !== undefined) {
      const ensureSelection = selection || createValueSelection([])

      const operations = insert(json, ensureSelection, pastedText, parser)

      debug('paste', { pastedText, operations, ensureSelection })

      onPatch(operations, (patchedJson, patchedState) => {
        let updatedState = patchedState

        // expand newly inserted object/array
        operations
          .filter(
            (operation) =>
              (isJSONPatchAdd(operation) || isJSONPatchReplace(operation)) &&
              isObjectOrArray(operation.value)
          )
          .forEach((operation) => {
            const path = parsePath(json, operation.path)
            updatedState = expandSmart(patchedJson, updatedState, path)
          })

        return {
          state: updatedState
        }
      })
    } else {
      // no json: empty document, or the contents is invalid text
      debug('paste text', { pastedText })

      onChangeText(clipboardText, (patchedJson, patchedState) => {
        if (patchedJson) {
          const path: JSONPath = []
          return {
            state: expandSmart(patchedJson, patchedState, path)
          }
        }

        return undefined
      })
    }
  }

  try {
    doPaste(clipboardText)
  } catch {
    openRepairModal(clipboardText, (repairedText) => {
      debug('repaired pasted text: ', repairedText)
      doPaste(repairedText)
    })
  }
}

export interface OnRemoveAction {
  json: unknown | undefined
  text: string | undefined
  selection: JSONSelection | undefined
  keepSelection: boolean
  readOnly: boolean
  onChange: OnChange
  onPatch: OnPatch
}

// TODO: write unit tests
export function onRemove({
  json,
  text,
  selection,
  keepSelection,
  readOnly,
  onChange,
  onPatch
}: OnRemoveAction) {
  if (readOnly || !selection) {
    return
  }

  // in case of a selected key or value, we change the selection to the whole
  // entry to remove this, we do not want to clear a key or value only.
  const removeSelection =
    json !== undefined && (isKeySelection(selection) || isValueSelection(selection))
      ? createMultiSelection(selection.path, selection.path)
      : selection

  if (isEmpty(getFocusPath(selection))) {
    // root selected -> clear complete document
    debug('remove root', { selection })

    if (onChange) {
      onChange(
        { text: '', json: undefined },
        json !== undefined ? { text: undefined, json } : { text: text || '', json },
        {
          contentErrors: undefined,
          patchResult: undefined
        }
      )
    }
  } else {
    // remove selection
    if (json !== undefined) {
      const { operations, newSelection } = createRemoveOperations(json, removeSelection)

      debug('remove', { operations, selection, newSelection })

      onPatch(operations, (_, patchedState) => ({
        state: patchedState,
        selection: keepSelection ? selection : newSelection
      }))
    }
  }
}

export interface OnDuplicateRowAction {
  json: unknown | undefined
  selection: JSONSelection | undefined
  columns: JSONPath[]
  readOnly: boolean
  onPatch: OnPatch
}

/**
 * This function assumes that the json holds the Array that we're duplicating a row for,
 * it cannot duplicate something in some nested array
 */
// TODO: write unit tests
export function onDuplicateRow({
  json,
  selection,
  columns,
  readOnly,
  onPatch
}: OnDuplicateRowAction) {
  if (readOnly || json === undefined || !selection || !hasSelectionContents(selection)) {
    return
  }

  const { rowIndex, columnIndex } = toTableCellPosition(getFocusPath(selection), columns)

  debug('duplicate row', { rowIndex })

  const rowPath = [String(rowIndex)]
  const operations = duplicate(json, [rowPath])

  onPatch(operations, (_, patchedState) => {
    const newRowIndex = rowIndex < (json as Array<unknown>).length ? rowIndex + 1 : rowIndex
    const newPath = fromTableCellPosition({ rowIndex: newRowIndex, columnIndex }, columns)
    const newSelection = createValueSelection(newPath)

    return {
      state: patchedState,
      selection: newSelection
    }
  })
}

export interface OnInsertBeforeRowAction {
  json: unknown | undefined
  selection: JSONSelection | undefined
  columns: JSONPath[]
  readOnly: boolean
  onPatch: OnPatch
}

/**
 * This function assumes that the json holds the Array that we're duplicating a row for,
 * it cannot duplicate something in some nested array
 */
// TODO: write unit tests
export function onInsertBeforeRow({
  json,
  selection,
  columns,
  readOnly,
  onPatch
}: OnInsertBeforeRowAction) {
  if (readOnly || json === undefined || !selection || !hasSelectionContents(selection)) {
    return
  }

  const { rowIndex } = toTableCellPosition(getFocusPath(selection), columns)

  debug('insert before row', { rowIndex })

  const rowPath = [String(rowIndex)]
  const newValue = isJSONObject((json as Array<unknown>)[0]) ? {} : ''
  const values = [{ key: '', value: newValue }]
  const operations = insertBefore(json, rowPath, values)

  onPatch(operations)
}

export interface OnInsertAfterRowAction {
  json: unknown | undefined
  selection: JSONSelection | undefined
  columns: JSONPath[]
  readOnly: boolean
  onPatch: OnPatch
}

/**
 * This function assumes that the json holds the Array that we're duplicating a row for,
 * it cannot duplicate something in some nested array
 */
// TODO: write unit tests
export function onInsertAfterRow({
  json,
  selection,
  columns,
  readOnly,
  onPatch
}: OnInsertAfterRowAction) {
  if (readOnly || json === undefined || !selection || !hasSelectionContents(selection)) {
    return
  }

  const { rowIndex, columnIndex } = toTableCellPosition(getFocusPath(selection), columns)

  debug('insert after row', { rowIndex })

  const nextRowIndex = rowIndex + 1
  const nextRowPath = [String(nextRowIndex)]
  const newValue = isJSONObject((json as Array<unknown>)[0]) ? {} : ''
  const values = [{ key: '', value: newValue }]

  const operations =
    nextRowIndex < (json as Array<unknown>).length
      ? insertBefore(json, nextRowPath, values)
      : append(json, [], values)

  onPatch(operations, (_, patchedState) => {
    const nextPath = fromTableCellPosition({ rowIndex: nextRowIndex, columnIndex }, columns)
    const newSelection = createValueSelection(nextPath)

    return {
      state: patchedState,
      selection: newSelection
    }
  })
}

export interface OnRemoveRowAction {
  json: unknown | undefined
  selection: JSONSelection | undefined
  columns: JSONPath[]
  readOnly: boolean
  onPatch: OnPatch
}

/**
 * This function assumes that the json holds the Array that we're duplicating a row for,
 * it cannot duplicate something in some nested array
 */
// TODO: write unit tests
export function onRemoveRow({ json, selection, columns, readOnly, onPatch }: OnRemoveRowAction) {
  if (readOnly || json === undefined || !selection || !hasSelectionContents(selection)) {
    return
  }

  const { rowIndex, columnIndex } = toTableCellPosition(getFocusPath(selection), columns)

  debug('remove row', { rowIndex })

  const rowPath = [String(rowIndex)]
  const operations = removeAll([rowPath])

  onPatch(operations, (patchedJson, patchedState) => {
    const newRowIndex =
      rowIndex < (patchedJson as Array<unknown>).length
        ? rowIndex
        : rowIndex > 0
          ? rowIndex - 1
          : undefined

    const newSelection =
      newRowIndex !== undefined
        ? createValueSelection(
            fromTableCellPosition({ rowIndex: newRowIndex, columnIndex }, columns)
          )
        : undefined

    debug('remove row new selection', { rowIndex, newRowIndex, newSelection })

    return {
      state: patchedState,
      selection: newSelection
    }
  })
}

export interface OnInsert {
  insertType: InsertType
  selectInside: boolean
  json: unknown | undefined
  selection: JSONSelection | undefined
  initialValue: string | undefined
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
  onReplaceJson: (updatedJson: unknown, afterPatch: AfterPatchCallback) => void
}

// TODO: write unit tests
export function onInsert({
  insertType,
  selectInside,
  initialValue,
  json,
  selection,
  readOnly,
  parser,
  onPatch,
  onReplaceJson
}: OnInsert): void {
  if (readOnly) {
    return
  }

  const newValue = createNewValue(json, selection, insertType)

  if (json !== undefined) {
    const data = parser.stringify(newValue) as string
    const operations = insert(json, selection, data, parser)
    debug('onInsert', { insertType, operations, newValue, data })

    const operation = last(
      operations.filter((operation) => operation.op === 'add' || operation.op === 'replace')
    )

    onPatch(operations, (patchedJson, patchedState, patchedSelection) => {
      // TODO: extract determining the newSelection in a separate function
      if (operation) {
        const path = parsePath(patchedJson, operation.path)

        if (isObjectOrArray(newValue)) {
          return {
            state: expandPath(patchedJson, patchedState, path, expandAll),
            selection: selectInside ? createInsideSelection(path) : patchedSelection
          }
        }

        if (newValue === '') {
          // open the newly inserted value in edit mode
          const parent = !isEmpty(path) ? getIn(patchedJson, initial(path)) : undefined

          return {
            state: expandPath(patchedJson, patchedState, path, expandNone),
            selection: isObject(parent)
              ? createEditKeySelection(path, initialValue)
              : createEditValueSelection(path, initialValue)
          }
        }
      }

      return undefined
    })

    debug('after patch')
  } else {
    // document is empty or invalid (in that case it has text but no json)
    debug('onInsert', { insertType, newValue })

    const path: JSONPath = []
    onReplaceJson(newValue, (patchedJson, patchedState) => ({
      state: expandSmart(patchedJson, patchedState, path),
      selection: isObjectOrArray(newValue)
        ? createInsideSelection(path)
        : createEditValueSelection(path)
    }))
  }
}

export interface OnInsertCharacter {
  char: string
  selectInside: boolean
  json: unknown | undefined
  selection: JSONSelection | undefined
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
  onReplaceJson: (updatedJson: unknown, afterPatch: AfterPatchCallback) => void
  onSelect: OnJSONSelect
}

// TODO: write unit tests
export async function onInsertCharacter({
  char,
  selectInside,
  json,
  selection,
  readOnly,
  parser,
  onPatch,
  onReplaceJson,
  onSelect
}: OnInsertCharacter) {
  // a regular key like a, A, _, etc. is entered.
  // Replace selected contents with a new value having this first character as text
  if (readOnly) {
    return
  }

  if (isKeySelection(selection)) {
    onSelect({ ...selection, edit: true, initialValue: char })
    return
  }

  if (char === '{') {
    onInsert({
      insertType: 'object',
      selectInside,
      initialValue: undefined, // not relevant
      json,
      selection,
      readOnly,
      parser,
      onPatch,
      onReplaceJson
    })
  } else if (char === '[') {
    onInsert({
      insertType: 'array',
      selectInside,
      initialValue: undefined, // not relevant
      json,
      selection,
      readOnly,
      parser,
      onPatch,
      onReplaceJson
    })
  } else {
    if (isValueSelection(selection) && json !== undefined) {
      if (!isObjectOrArray(getIn(json, selection.path))) {
        onSelect({ ...selection, edit: true, initialValue: char })
      } else {
        // TODO: replace the object/array with editing a text in edit mode?
        //  (Ideally this this should not create an entry in history though,
        //  which isn't really possible right now since we have to apply
        //  a patch to change the object/array into a value)
      }
    } else {
      debug('onInsertValueWithCharacter', { char })
      await onInsertValueWithCharacter({
        char,
        json,
        selection,
        readOnly,
        parser,
        onPatch,
        onReplaceJson
      })
    }
  }
}

interface OnInsertValueWithCharacter {
  char: string
  json: unknown | undefined
  selection: JSONSelection | undefined
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
  onReplaceJson: (updatedJson: unknown, afterPatch: AfterPatchCallback) => void
}

async function onInsertValueWithCharacter({
  char,
  json,
  selection,
  readOnly,
  parser,
  onPatch,
  onReplaceJson
}: OnInsertValueWithCharacter) {
  if (readOnly) {
    return
  }

  // first insert a new value
  onInsert({
    insertType: 'value',
    selectInside: false, // not relevant, we insert a value, not an object or array
    initialValue: char,
    json,
    selection,
    readOnly,
    parser,
    onPatch,
    onReplaceJson
  })
}
