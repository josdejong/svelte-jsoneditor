import {
  createInsideSelection,
  createKeySelection,
  createMultiSelection,
  createValueSelection,
  hasSelectionContents,
  isEditingSelection,
  isKeySelection,
  isValueSelection,
  selectionToPartialJson
} from '$lib/logic/selection'
import copyToClipboard from '$lib/utils/copyToClipboard'
import { createNewValue, createRemoveOperations, insert } from '$lib/logic/operations'
import type {
  AfterPatchCallback,
  DocumentState,
  InsertType,
  JSONParser,
  OnChange,
  OnChangeText,
  OnPatch,
  OnSelect
} from '../types'
import type { JSONValue } from 'lossless-json'
import { createDebug } from '$lib/utils/debug'
import { getIn, isJSONPatchAdd, isJSONPatchReplace, parsePath } from 'immutable-json-patch'
import { isObject, isObjectOrArray } from '$lib/utils/typeUtils'
import {
  expandAll,
  expandPath,
  expandRecursive,
  expandWithCallback
} from '$lib/logic/documentState'
import { initial, isEmpty, last } from 'lodash-es'
import { insertActiveElementContents } from '$lib/utils/domUtils'

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
  if (readOnly || !hasSelectionContents(documentState.selection)) {
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
  json: JSONValue | undefined
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

interface OnPasteAction {
  clipboardText: string
  json: JSONValue | undefined
  documentState: DocumentState
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
  onChangeText: OnChangeText
  openRepairModal: (clipboardText: string, RepairModalCallback) => void
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
      const selection = documentState.selection || createMultiSelection(json || {}, [], [])

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
          const path = []
          return {
            state: expandRecursive(patchedJson, patchedState, path)
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
  readOnly: boolean
  onChange: OnChange
  onPatch: OnPatch
}

// TODO: write unit tests
export function onRemove({
  json,
  text,
  documentState,
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
    isKeySelection(documentState.selection) || isValueSelection(documentState.selection)
      ? createMultiSelection(
          json,
          documentState.selection.anchorPath,
          documentState.selection.focusPath
        )
      : documentState.selection

  if (isEmpty(documentState.selection.focusPath)) {
    // root selected -> clear complete document
    debug('remove root', { selection: documentState.selection })

    onChange(
      { text: '', json: undefined },
      { text, json },
      {
        contentErrors: { validationErrors: [] },
        patchResult: null
      }
    )
  } else {
    // remove selection
    const { operations, newSelection } = createRemoveOperations(json, removeSelection)

    debug('remove', { operations, selection: documentState.selection, newSelection })

    onPatch(operations, (patchedJson, patchedState) => ({
      state: {
        ...patchedState,
        selection: newSelection
      }
    }))
  }
}

export interface OnInsert {
  insertType: InsertType
  refJsonEditor: HTMLElement
  json: JSONValue | undefined
  documentState: DocumentState
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
  onReplaceJson: (updatedJson: JSONValue, afterPatch: AfterPatchCallback) => void
  tick: () => Promise<void>
}

// TODO: write unit tests
export function onInsert({
  insertType,
  refJsonEditor,
  json,
  documentState,
  readOnly,
  parser,
  onPatch,
  onReplaceJson,
  tick
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
              selection: createInsideSelection(path)
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
        tick().then(() => {
          setTimeout(() => insertActiveElementContents(refJsonEditor, '', true))
        })
      }
    }
  } else {
    // document is empty or invalid (in that case it has text but no json)
    debug('onInsert', { insertType, newValue })

    const path = []
    onReplaceJson(newValue, (patchedJson, patchedState) => ({
      state: {
        ...expandRecursive(patchedJson, patchedState, path),
        selection: createInsideSelection(path)
      }
    }))
  }
}

export interface OnInsertCharacter {
  char: string
  refJsonEditor: HTMLElement
  json: JSONValue
  documentState: DocumentState
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
  onReplaceJson: (updatedJson: JSONValue, afterPatch: AfterPatchCallback) => void
  onSelect: OnSelect
  tick: () => Promise<void>
}

export async function onInsertCharacter({
  char,
  refJsonEditor,
  json,
  documentState,
  readOnly,
  parser,
  onPatch,
  onReplaceJson,
  onSelect,
  tick
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
    await tick()
    setTimeout(() => insertActiveElementContents(refJsonEditor, char, replaceContents))
    return
  }

  if (char === '{') {
    onInsert({
      insertType: 'object',
      refJsonEditor,
      json,
      documentState,
      readOnly,
      parser,
      onPatch,
      onReplaceJson,
      tick
    })
  } else if (char === '[') {
    onInsert({
      insertType: 'array',
      refJsonEditor,
      json,
      documentState,
      readOnly,
      parser,
      onPatch,
      onReplaceJson,
      tick
    })
  } else {
    if (isValueSelection(documentState.selection)) {
      if (!isObjectOrArray(getIn(json, documentState.selection.focusPath))) {
        // only replace contents when not yet in edit mode (can happen when entering
        // multiple characters very quickly after each other due to the async handling)
        const replaceContents = !documentState.selection.edit

        onSelect({ ...documentState.selection, edit: true })
        await tick()
        setTimeout(() => insertActiveElementContents(refJsonEditor, char, replaceContents))
      } else {
        // TODO: replace the object/array with editing a text in edit mode?
        //  (Ideally this this should not create an entry in history though,
        //  which isn't really possible right now since we have to apply
        //  a patch to change the object/array into a value)
      }
    } else {
      await onInsertValueWithCharacter({
        char,
        refJsonEditor,
        json,
        documentState,
        readOnly,
        parser,
        onPatch,
        onReplaceJson,
        onSelect,
        tick
      })
    }
  }
}

interface OnInsertValueWithCharacter {
  char: string
  refJsonEditor: HTMLElement
  json: JSONValue
  documentState: DocumentState
  readOnly: boolean
  parser: JSONParser
  onPatch: OnPatch
  onReplaceJson: (updatedJson: JSONValue, afterPatch: AfterPatchCallback) => void
  onSelect: OnSelect
  tick: () => Promise<void>
}

async function onInsertValueWithCharacter({
  char,
  refJsonEditor,
  json,
  documentState,
  readOnly,
  parser,
  onPatch,
  onReplaceJson,
  onSelect,
  tick
}: OnInsertValueWithCharacter) {
  if (readOnly || !documentState.selection) {
    return
  }

  // first insert a new value
  onInsert({
    insertType: 'value',
    refJsonEditor,
    json,
    documentState,
    readOnly,
    parser,
    onPatch,
    onReplaceJson,
    tick
  })

  // only replace contents when not yet in edit mode (can happen when entering
  // multiple characters very quickly after each other due to the async handling)
  const replaceContents = !isEditingSelection(documentState.selection)

  // next, open the new value in edit mode and apply the current character
  const path = documentState.selection.focusPath
  const parent = getIn(json, initial(path))

  if (Array.isArray(parent) || !parent || isValueSelection(documentState.selection)) {
    onSelect(createValueSelection(path, true))
  } else {
    onSelect(createKeySelection(path, true))
  }

  await tick()
  setTimeout(() => insertActiveElementContents(refJsonEditor, char, replaceContents))
}
