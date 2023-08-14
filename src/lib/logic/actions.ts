import {
  createInsideSelection,
  createKeySelection,
  createMultiSelection,
  createValueSelection,
  getFocusPath,
  hasSelectionContents,
  isEditingSelection,
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
  DocumentState,
  InsertType,
  JSONParser,
  OnChange,
  OnChangeText,
  OnPatch,
  OnJSONSelect
} from '$lib/types'
import { createDebug } from '$lib/utils/debug.js'
import {
  getIn,
  isJSONObject,
  isJSONPatchAdd,
  isJSONPatchReplace,
  type JSONArray,
  type JSONPath,
  type JSONValue,
  parsePath
} from 'immutable-json-patch'
import { isObject, isObjectOrArray } from '$lib/utils/typeUtils.js'
import {
  expandAll,
  expandPath,
  expandRecursive,
  expandWithCallback
} from '$lib/logic/documentState.js'
import { initial, isEmpty, last } from 'lodash-es'
import { insertActiveElementContents } from '$lib/utils/domUtils.js'
import { fromTableCellPosition, toTableCellPosition } from '$lib/logic/table.js'

const debug = createDebug('jsoneditor:actions')

export interface OnCutAction {
  json: JSONValue | undefined
  documentState: DocumentState
  indentation: string | number | undefined
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
}

// TODO: write unit tests
export async function onCut({
  json,
  documentState,
  indentation,
  readOnly,
  parser,
  onPatch
}: OnCutAction) {
  if (
    readOnly ||
    json === undefined ||
    !documentState.selection ||
    !hasSelectionContents(documentState.selection)
  ) {
    return
  }

  const clipboard = selectionToPartialJson(json, documentState.selection, indentation, parser)
  if (clipboard == null) {
    return
  }

  debug('cut', { selection: documentState.selection, clipboard, indentation })

  await copyToClipboard(clipboard)

  const { operations, newSelection } = createRemoveOperations(json, documentState.selection)

  onPatch(operations, (patchedJson, patchedState) => ({
    state: {
      ...patchedState,
      selection: newSelection
    }
  }))
}

export interface OnCopyAction {
  json: JSONValue
  documentState: DocumentState
  indentation: string | number | undefined
  parser: JSONParser
}

// TODO: write unit tests
export async function onCopy({ json, documentState, indentation, parser }: OnCopyAction) {
  const clipboard = selectionToPartialJson(json, documentState.selection, indentation, parser)
  if (clipboard == null) {
    return
  }

  debug('copy', { clipboard, indentation })

  await copyToClipboard(clipboard)
}

type RepairModalCallback = (text: string, onApply: (repairedText: string) => void) => void

interface OnPasteAction {
  clipboardText: string
  json: JSONValue | undefined
  documentState: DocumentState
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
  onChangeText: OnChangeText
  openRepairModal: (clipboardText: string, callback: RepairModalCallback) => void
}

// TODO: write unit tests
export function onPaste({
  clipboardText,
  json,
  documentState,
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
      const selection = documentState.selection || createMultiSelection([], [])

      const operations = insert(json, selection, pastedText, parser)

      debug('paste', { pastedText, operations, selection })

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
            updatedState = expandRecursive(patchedJson, updatedState, path)
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
            state: expandRecursive(patchedJson, patchedState, path) as DocumentState
          }
        }
      })
    }
  }

  try {
    doPaste(clipboardText)
  } catch (err) {
    openRepairModal(clipboardText, (repairedText) => {
      debug('repaired pasted text: ', repairedText)
      doPaste(repairedText)
    })
  }
}

export interface OnRemoveAction {
  json: JSONValue | undefined
  text: string | undefined
  documentState: DocumentState
  keepSelection: boolean
  readOnly: boolean
  onChange: OnChange
  onPatch: OnPatch
}

// TODO: write unit tests
export function onRemove({
  json,
  text,
  documentState,
  keepSelection,
  readOnly,
  onChange,
  onPatch
}: OnRemoveAction) {
  if (readOnly || !documentState.selection) {
    return
  }

  // in case of a selected key or value, we change the selection to the whole
  // entry to remove this, we do not want to clear a key or value only.
  const removeSelection =
    json !== undefined &&
    (isKeySelection(documentState.selection) || isValueSelection(documentState.selection))
      ? createMultiSelection(documentState.selection.path, documentState.selection.path)
      : documentState.selection

  if (isEmpty(getFocusPath(documentState.selection))) {
    // root selected -> clear complete document
    debug('remove root', { selection: documentState.selection })

    if (onChange) {
      onChange(
        { text: '', json: undefined },
        json !== undefined ? { text: undefined, json } : { text: text || '', json },
        {
          contentErrors: null,
          patchResult: null
        }
      )
    }
  } else {
    // remove selection
    if (json !== undefined) {
      const { operations, newSelection } = createRemoveOperations(json, removeSelection)

      debug('remove', { operations, selection: documentState.selection, newSelection })

      onPatch(operations, (patchedJson, patchedState) => ({
        state: {
          ...patchedState,
          selection: keepSelection ? documentState.selection : newSelection
        }
      }))
    }
  }
}

export interface OnDuplicateRowAction {
  json: JSONValue | undefined
  documentState: DocumentState
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
  documentState,
  columns,
  readOnly,
  onPatch
}: OnDuplicateRowAction) {
  if (
    readOnly ||
    json === undefined ||
    !documentState.selection ||
    !hasSelectionContents(documentState.selection)
  ) {
    return
  }

  const { rowIndex, columnIndex } = toTableCellPosition(
    getFocusPath(documentState.selection),
    columns
  )

  debug('duplicate row', { rowIndex })

  const rowPath = [String(rowIndex)]
  const operations = duplicate(json, [rowPath])

  onPatch(operations, (patchedJson, patchedState) => {
    const newRowIndex = rowIndex < (json as JSONArray).length ? rowIndex + 1 : rowIndex
    const newPath = fromTableCellPosition({ rowIndex: newRowIndex, columnIndex }, columns)
    const newSelection = createValueSelection(newPath, false)

    return {
      state: {
        ...patchedState,
        selection: newSelection
      }
    }
  })
}

export interface OnInsertBeforeRowAction {
  json: JSONValue | undefined
  documentState: DocumentState
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
  documentState,
  columns,
  readOnly,
  onPatch
}: OnInsertBeforeRowAction) {
  if (
    readOnly ||
    json === undefined ||
    !documentState.selection ||
    !hasSelectionContents(documentState.selection)
  ) {
    return
  }

  const { rowIndex } = toTableCellPosition(getFocusPath(documentState.selection), columns)

  debug('insert before row', { rowIndex })

  const rowPath = [String(rowIndex)]
  const newValue = isJSONObject((json as JSONArray)[0]) ? {} : ''
  const values = [{ key: '', value: newValue }]
  const operations = insertBefore(json, rowPath, values)

  onPatch(operations)
}

export interface OnInsertAfterRowAction {
  json: JSONValue | undefined
  documentState: DocumentState
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
  documentState,
  columns,
  readOnly,
  onPatch
}: OnInsertAfterRowAction) {
  if (
    readOnly ||
    json === undefined ||
    !documentState.selection ||
    !hasSelectionContents(documentState.selection)
  ) {
    return
  }

  const { rowIndex, columnIndex } = toTableCellPosition(
    getFocusPath(documentState.selection),
    columns
  )

  debug('insert after row', { rowIndex })

  const nextRowIndex = rowIndex + 1
  const nextRowPath = [String(nextRowIndex)]
  const newValue = isJSONObject((json as JSONArray)[0]) ? {} : ''
  const values = [{ key: '', value: newValue }]

  const operations =
    nextRowIndex < (json as JSONArray).length
      ? insertBefore(json, nextRowPath, values)
      : append(json, [], values)

  onPatch(operations, (patchedJson, patchedState) => {
    const nextPath = fromTableCellPosition({ rowIndex: nextRowIndex, columnIndex }, columns)
    const newSelection = createValueSelection(nextPath, false)

    return {
      state: {
        ...patchedState,
        selection: newSelection
      }
    }
  })
}

export interface OnRemoveRowAction {
  json: JSONValue | undefined
  documentState: DocumentState
  columns: JSONPath[]
  readOnly: boolean
  onPatch: OnPatch
}

/**
 * This function assumes that the json holds the Array that we're duplicating a row for,
 * it cannot duplicate something in some nested array
 */
// TODO: write unit tests
export function onRemoveRow({
  json,
  documentState,
  columns,
  readOnly,
  onPatch
}: OnRemoveRowAction) {
  if (
    readOnly ||
    json === undefined ||
    !documentState.selection ||
    !hasSelectionContents(documentState.selection)
  ) {
    return
  }

  const { rowIndex, columnIndex } = toTableCellPosition(
    getFocusPath(documentState.selection),
    columns
  )

  debug('remove row', { rowIndex })

  const rowPath = [String(rowIndex)]
  const operations = removeAll([rowPath])

  onPatch(operations, (patchedJson, patchedState) => {
    const newRowIndex =
      rowIndex < (patchedJson as JSONArray).length
        ? rowIndex
        : rowIndex > 0
        ? rowIndex - 1
        : undefined

    const newSelection =
      newRowIndex !== undefined
        ? createValueSelection(
            fromTableCellPosition({ rowIndex: newRowIndex, columnIndex }, columns),
            false
          )
        : null

    debug('remove row new selection', { rowIndex, newRowIndex, newSelection })

    return {
      state: {
        ...patchedState,
        selection: newSelection
      }
    }
  })
}

export interface OnInsert {
  insertType: InsertType
  selectInside: boolean
  refJsonEditor: HTMLElement
  json: JSONValue | undefined
  documentState: DocumentState
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
  onReplaceJson: (updatedJson: JSONValue, afterPatch: AfterPatchCallback) => void
}

// TODO: write unit tests
export function onInsert({
  insertType,
  selectInside,
  refJsonEditor,
  json,
  documentState,
  readOnly,
  parser,
  onPatch,
  onReplaceJson
}: OnInsert): void {
  if (readOnly || !documentState.selection) {
    return
  }

  const newValue = createNewValue(json, documentState.selection, insertType)

  if (json !== undefined) {
    const data = parser.stringify(newValue)
    const operations = insert(json, documentState.selection, data, parser)
    debug('onInsert', { insertType, operations, newValue, data })

    const operation = last(
      operations.filter((operation) => operation.op === 'add' || operation.op === 'replace')
    )

    onPatch(operations, (patchedJson, patchedState) => {
      // TODO: extract determining the newSelection in a separate function
      if (operation) {
        const path = parsePath(patchedJson, operation.path)

        if (isObjectOrArray(newValue)) {
          return {
            state: {
              ...expandWithCallback(patchedJson, patchedState, path, expandAll),
              selection: selectInside ? createInsideSelection(path) : patchedState.selection
            }
          }
        }

        if (newValue === '') {
          // open the newly inserted value in edit mode
          const parent = !isEmpty(path) ? getIn(patchedJson, initial(path)) : null

          return {
            // expandPath is invoked to make sure that visibleSections is extended when needed
            state: expandPath(
              patchedJson,
              {
                ...documentState,
                selection: isObject(parent)
                  ? createKeySelection(path, true)
                  : createValueSelection(path, true)
              },
              path
            )
          }
        }

        return undefined
      }
    })

    debug('after patch')

    if (operation) {
      if (newValue === '') {
        // open the newly inserted value in edit mode
        tick2(() => insertActiveElementContents(refJsonEditor, '', true))
      }
    }
  } else {
    // document is empty or invalid (in that case it has text but no json)
    debug('onInsert', { insertType, newValue })

    const path: JSONPath = []
    onReplaceJson(newValue, (patchedJson, patchedState) => ({
      state: {
        ...expandRecursive(patchedJson, patchedState, path),
        selection: createValueSelection(path, true)
      }
    }))
  }
}

export interface OnInsertCharacter {
  char: string
  selectInside: boolean
  refJsonEditor: HTMLElement
  json: JSONValue | undefined
  documentState: DocumentState
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
  onReplaceJson: (updatedJson: JSONValue, afterPatch: AfterPatchCallback) => void
  onSelect: OnJSONSelect
}

// TODO: write unit tests
export async function onInsertCharacter({
  char,
  selectInside,
  refJsonEditor,
  json,
  documentState,
  readOnly,
  parser,
  onPatch,
  onReplaceJson,
  onSelect
}: OnInsertCharacter) {
  // a regular key like a, A, _, etc is entered.
  // Replace selected contents with a new value having this first character as text
  if (readOnly || !documentState.selection) {
    return
  }

  if (isKeySelection(documentState.selection)) {
    // only replace contents when not yet in edit mode (can happen when entering
    // multiple characters very quickly after each other due to the async handling)
    const replaceContents = !documentState.selection.edit

    onSelect({ ...documentState.selection, edit: true })
    tick2(() => insertActiveElementContents(refJsonEditor, char, replaceContents))
    return
  }

  if (char === '{') {
    onInsert({
      insertType: 'object',
      selectInside,
      refJsonEditor,
      json,
      documentState,
      readOnly,
      parser,
      onPatch,
      onReplaceJson
    })
  } else if (char === '[') {
    onInsert({
      insertType: 'array',
      selectInside,
      refJsonEditor,
      json,
      documentState,
      readOnly,
      parser,
      onPatch,
      onReplaceJson
    })
  } else {
    if (isValueSelection(documentState.selection) && json !== undefined) {
      if (!isObjectOrArray(getIn(json, documentState.selection.path))) {
        // only replace contents when not yet in edit mode (can happen when entering
        // multiple characters very quickly after each other due to the async handling)
        const replaceContents = !documentState.selection.edit

        onSelect({ ...documentState.selection, edit: true })
        tick2(() => insertActiveElementContents(refJsonEditor, char, replaceContents))
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
        refJsonEditor,
        json,
        documentState,
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
  refJsonEditor: HTMLElement
  json: JSONValue | undefined
  documentState: DocumentState
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
  onReplaceJson: (updatedJson: JSONValue, afterPatch: AfterPatchCallback) => void
}

async function onInsertValueWithCharacter({
  char,
  refJsonEditor,
  json,
  documentState,
  readOnly,
  parser,
  onPatch,
  onReplaceJson
}: OnInsertValueWithCharacter) {
  if (readOnly || !documentState.selection) {
    return
  }

  // first insert a new value
  onInsert({
    insertType: 'value',
    selectInside: false, // not relevant, we insert a value, not an object or array
    refJsonEditor,
    json,
    documentState,
    readOnly,
    parser,
    onPatch,
    onReplaceJson
  })

  // only replace contents when not yet in edit mode (can happen when entering
  // multiple characters very quickly after each other due to the async handling)
  const replaceContents = !isEditingSelection(documentState.selection)

  tick2(() => insertActiveElementContents(refJsonEditor, char, replaceContents))
}

/**
 * set two timeouts, two ticks of delay.
 * This allows to perform some action in the DOM *after* Svelte has re-rendered the app for example
 * WARNING: try to avoid using this function, it is tricky to rely on it.
 */
function tick2(callback: () => void) {
  setTimeout(() => setTimeout(callback))
}
