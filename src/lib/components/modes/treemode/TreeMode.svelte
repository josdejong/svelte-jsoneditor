<svelte:options immutable={true} />

<script lang="ts">
  import { createAutoScrollHandler } from '../../controls/createAutoScrollHandler.js'
  import { faCheck, faCode, faWrench } from '@fortawesome/free-solid-svg-icons'
  import { createDebug } from '$lib/utils/debug.js'
  import {
    compileJSONPointer,
    existsIn,
    getIn,
    immutableJSONPatch,
    type JSONPatchDocument,
    type JSONPath
  } from 'immutable-json-patch'
  import { jsonrepair } from 'jsonrepair'
  import { initial, isEmpty, isEqual, noop, uniqueId } from 'lodash-es'
  import { getContext, onDestroy, onMount, tick } from 'svelte'
  import { createJump } from '$lib/assets/jump.js/src/jump.js'
  import {
    CONTEXT_MENU_HEIGHT,
    CONTEXT_MENU_WIDTH,
    SCROLL_DURATION,
    SEARCH_BOX_HEIGHT
  } from '$lib/constants.js'
  import {
    collapsePath,
    createDocumentState,
    documentStatePatch,
    expandAll,
    expandMinimal,
    expandNone,
    expandPath,
    expandSection,
    expandSelf,
    expandSmart,
    expandSmartIfCollapsed,
    getEnforceString,
    setInDocumentState,
    syncDocumentState
  } from '$lib/logic/documentState.js'
  import { duplicate, extract, revertJSONPatchWithMoveOperations } from '$lib/logic/operations.js'
  import {
    canConvert,
    createAfterSelection,
    createEditKeySelection,
    createEditValueSelection,
    createInsideSelection,
    createSelectionFromOperations,
    createValueSelection,
    findRootPath,
    getAnchorPath,
    getEndPath,
    getFocusPath,
    getInitialSelection,
    getSelectionDown,
    getSelectionLeft,
    getSelectionNextInside,
    getSelectionPaths,
    getSelectionRight,
    getSelectionUp,
    hasSelectionContents,
    isAfterSelection,
    isEditingSelection,
    isInsideSelection,
    isJSONSelection,
    isKeySelection,
    isMultiSelection,
    isMultiSelectionWithOneItem,
    isSelectionInsidePath,
    isValueSelection,
    removeEditModeFromSelection,
    selectAll
  } from '$lib/logic/selection.js'
  import { toRecursiveValidationErrors, validateJSON } from '$lib/logic/validation.js'
  import {
    activeElementIsChildOf,
    createNormalizationFunctions,
    encodeDataPath,
    findParentWithNodeName,
    getWindow,
    isChildOf,
    isChildOfNodeName
  } from '$lib/utils/domUtils.js'
  import {
    convertValue,
    isJSONContent,
    isTextContent,
    normalizeJsonParseError,
    parseAndRepair,
    parsePartialJson,
    repairPartialJson
  } from '$lib/utils/jsonUtils.js'
  import { keyComboFromEvent } from '$lib/utils/keyBindings.js'
  import { isObjectOrArray, isUrl, stringConvert } from '$lib/utils/typeUtils.js'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'
  import Message from '../../controls/Message.svelte'
  import ValidationErrorsOverview from '../../controls/ValidationErrorsOverview.svelte'
  import CopyPasteModal from '../../modals/CopyPasteModal.svelte'
  import JSONRepairModal from '../../modals/JSONRepairModal.svelte'
  import JSONNode from './JSONNode.svelte'
  import TreeMenu from './menu/TreeMenu.svelte'
  import Welcome from './Welcome.svelte'
  import NavigationBar from '../../controls/navigationBar/NavigationBar.svelte'
  import SearchBox from '../../controls/SearchBox.svelte'
  import type {
    AbsolutePopupContext,
    AbsolutePopupOptions,
    AfterPatchCallback,
    Content,
    ContentErrors,
    ContextMenuItem,
    ConvertType,
    DocumentState,
    History,
    HistoryItem,
    InsertType,
    JSONEditorSelection,
    JSONParser,
    JSONPatchResult,
    JSONPathParser,
    JSONRepairModalProps,
    JSONSelection,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnClassName,
    OnError,
    OnExpand,
    OnFocus,
    OnJSONEditorModal,
    OnRedo,
    OnRenderContextMenuInternal,
    OnRenderMenuInternal,
    OnRenderValue,
    OnSelect,
    OnSortModal,
    OnTransformModal,
    OnUndo,
    ParseError,
    PastedJson,
    SearchResultDetails,
    SearchResults,
    Section,
    TransformModalOptions,
    TreeModeContext,
    ValidationError,
    ValidationErrors,
    Validator,
    ValueNormalization
  } from '$lib/types'
  import { Mode, ValidationSeverity } from '$lib/types.js'
  import memoizeOne from 'memoize-one'
  import { measure } from '$lib/utils/timeUtils.js'
  import {
    onCopy,
    onCut,
    onInsert,
    onInsertCharacter,
    onPaste,
    onRemove
  } from '$lib/logic/actions.js'
  import JSONPreview from '../../controls/JSONPreview.svelte'
  import ContextMenu from '../../controls/contextmenu/ContextMenu.svelte'
  import createTreeContextMenuItems from './contextmenu/createTreeContextMenuItems'
  import { toRecursiveSearchResults as toRecursiveSearchResults } from 'svelte-jsoneditor/logic/search.js'
  import { isTreeHistoryItem } from 'svelte-jsoneditor'

  const debug = createDebug('jsoneditor:TreeMode')

  const isSSR = typeof window === 'undefined'
  debug('isSSR:', isSSR)

  const sortModalId = uniqueId()
  const transformModalId = uniqueId()

  const { openAbsolutePopup, closeAbsolutePopup } =
    getContext<AbsolutePopupContext>('absolute-popup')

  let refContents: HTMLDivElement | undefined
  let refHiddenInput: HTMLInputElement
  let refJsonEditor: HTMLDivElement
  let hasFocus = false
  const jump = createJump()

  export let readOnly: boolean
  export let externalContent: Content
  export let externalSelection: JSONEditorSelection | undefined
  export let history: History<HistoryItem>
  export let mainMenuBar: boolean
  export let navigationBar: boolean
  export let escapeControlCharacters: boolean
  export let escapeUnicodeCharacters: boolean
  export let parser: JSONParser
  export let parseMemoizeOne: JSONParser['parse']
  export let validator: Validator | undefined
  export let validationParser: JSONParser
  export let pathParser: JSONPathParser
  export let indentation: number | string
  export let onError: OnError
  export let onChange: OnChange
  export let onChangeMode: OnChangeMode
  export let onSelect: OnSelect
  export let onUndo: OnUndo
  export let onRedo: OnRedo
  export let onRenderValue: OnRenderValue
  export let onRenderMenu: OnRenderMenuInternal
  export let onRenderContextMenu: OnRenderContextMenuInternal
  export let onClassName: OnClassName | undefined
  export let onFocus: OnFocus
  export let onBlur: OnBlur
  export let onSortModal: OnSortModal
  export let onTransformModal: OnTransformModal
  export let onJSONEditorModal: OnJSONEditorModal

  // modalOpen is true when one of the modals is open.
  // This is used to track whether the editor still has focus
  let modalOpen = false
  let copyPasteModalOpen = false
  let jsonRepairModalProps: JSONRepairModalProps | undefined = undefined

  createFocusTracker({
    onMount,
    onDestroy,
    getWindow: () => getWindow(refJsonEditor),
    hasFocus: () => (modalOpen && document.hasFocus()) || activeElementIsChildOf(refJsonEditor),
    onFocus: () => {
      hasFocus = true
      if (onFocus) {
        onFocus()
      }
    },
    onBlur: () => {
      hasFocus = false
      if (onBlur) {
        onBlur()
      }
    }
  })

  let json: unknown | undefined
  let text: string | undefined
  let parseError: ParseError | undefined = undefined

  let documentStateInitialized = false
  let documentState: DocumentState | undefined = createDocumentState({ json })
  let selection: JSONSelection | undefined = isJSONSelection(externalSelection)
    ? externalSelection
    : undefined

  onMount(() => {
    if (selection) {
      const path = getFocusPath(selection)
      documentState = expandPath(json, documentState, path, expandNone)
      setTimeout(() => scrollIntoView(path))
    }
  })

  function handleSelect(updatedSelection: JSONSelection | undefined) {
    selection = updatedSelection
  }

  function emitOnSelect(updatedSelection: JSONSelection | undefined) {
    if (!isEqual(updatedSelection, externalSelection)) {
      debug('onSelect', updatedSelection)
      onSelect(updatedSelection)
    }
  }

  $: emitOnSelect(selection)

  let normalization: ValueNormalization
  $: normalization = createNormalizationFunctions({
    escapeControlCharacters,
    escapeUnicodeCharacters
  })

  let pastedJson: PastedJson | undefined

  let searchResultDetails: SearchResultDetails | undefined
  let searchResults: SearchResults | undefined
  let showSearch = false
  let showReplace = false

  $: applySearchBoxSpacing(showSearch)

  function applySearchBoxSpacing(showSearch: boolean) {
    if (!refContents) {
      return
    }

    if (showSearch && refContents.scrollTop === 0) {
      refContents.style.overflowAnchor = 'none'
      refContents.scrollTop += SEARCH_BOX_HEIGHT
      setTimeout(() => {
        if (refContents) {
          refContents.style.overflowAnchor = ''
        }
      })
    }
  }

  function handleSearch(result: SearchResultDetails | undefined) {
    searchResultDetails = result
    searchResults = searchResultDetails
      ? toRecursiveSearchResults(json, searchResultDetails.items)
      : undefined
  }

  async function handleFocusSearch(path: JSONPath) {
    documentState = expandPath(json, documentState, path, expandNone)
    await scrollTo(path)
  }

  function handleCloseSearch() {
    showSearch = false
    showReplace = false
    focus()
  }

  function handleSelectValidationError(error: ValidationError) {
    debug('select validation error', error)

    selection = createValueSelection(error.path)
    scrollTo(error.path)
  }

  export function expand(path: JSONPath, callback: OnExpand = expandSelf) {
    debug('expand')

    documentState = expandPath(json, documentState, path, callback)
  }

  export function collapse(path: JSONPath, recursive: boolean) {
    documentState = collapsePath(json, documentState, path, recursive)

    if (selection) {
      // check whether the selection is still visible and not collapsed
      if (isSelectionInsidePath(selection, path)) {
        // remove selection when not visible anymore
        selection = undefined
      }
    }
  }

  // two-way binding of externalContent and internal json and text (
  // when receiving an updated prop, we have to update state for example
  $: applyExternalContent(externalContent)

  $: applyExternalSelection(externalSelection)

  let textIsRepaired = false

  let validationErrorList: ValidationError[] = []
  let validationErrors: ValidationErrors | undefined

  $: updateValidationErrors(json, validator, parser, validationParser)

  // because onChange returns the validation errors and there is also a separate listener,
  // we would execute validation twice. Memoizing the last result solves this.
  const memoizedValidate = memoizeOne(validateJSON)

  function updateValidationErrors(
    json: unknown,
    validator: Validator | undefined,
    parser: JSONParser,
    validationParser: JSONParser
  ) {
    measure(
      () => {
        let newValidationErrorList: ValidationError[]
        try {
          newValidationErrorList = memoizedValidate(json, validator, parser, validationParser)
        } catch (err) {
          newValidationErrorList = [
            {
              path: [],
              message: 'Failed to validate: ' + (err as Error).message,
              severity: ValidationSeverity.warning
            }
          ]
        }

        if (!isEqual(newValidationErrorList, validationErrorList)) {
          debug('validationErrors changed:', newValidationErrorList)
          validationErrorList = newValidationErrorList
          validationErrors = toRecursiveValidationErrors(json, validationErrorList)
        }
      },
      (duration) => debug(`validationErrors updated in ${duration} ms`)
    )
  }

  export function validate(): ContentErrors | undefined {
    debug('validate')

    if (parseError) {
      return {
        parseError,
        isRepairable: false // not applicable, if repairable, we will not have a parseError
      }
    }

    // make sure the validation results are up-to-date
    // normally, they are only updated on the next tick after the json is changed
    updateValidationErrors(json, validator, parser, validationParser)
    return !isEmpty(validationErrorList) ? { validationErrors: validationErrorList } : undefined
  }

  export function getJson() {
    return json
  }

  function getDocumentState(): DocumentState | undefined {
    return documentState
  }

  function getSelection(): JSONSelection | undefined {
    return selection
  }

  function applyExternalContent(updatedContent: Content) {
    debug('applyExternalContent', { updatedContent })

    if (isJSONContent(updatedContent)) {
      applyExternalJson(updatedContent.json)
    } else if (isTextContent(updatedContent)) {
      applyExternalText(updatedContent.text)
    }
  }

  function applyExternalJson(updatedJson: unknown | undefined) {
    if (updatedJson === undefined) {
      return
    }

    // TODO: this is inefficient. Make an optional flag promising that the updates are immutable so we don't have to do a deep equality check? First do some profiling!
    const isChanged = !isEqual(json, updatedJson)

    debug('update external json', { isChanged, currentlyText: json === undefined })

    if (!isChanged) {
      // no actual change, don't do anything
      return
    }

    const previousState = { documentState, selection, json, text, textIsRepaired }

    json = updatedJson
    documentState = syncDocumentState(updatedJson, documentState)
    expandWhenNotInitialized(json)
    text = undefined
    textIsRepaired = false
    parseError = undefined
    clearSelectionWhenNotExisting(json)

    addHistoryItem(previousState)
  }

  function applyExternalText(updatedText: string | undefined) {
    if (updatedText === undefined || isJSONContent(externalContent)) {
      return
    }

    const isChanged = updatedText !== text

    debug('update external text', { isChanged })

    if (!isChanged) {
      // no actual change, don't do anything
      return
    }

    const previousState = { documentState, selection, json, text, textIsRepaired }

    try {
      json = parseMemoizeOne(updatedText)
      documentState = syncDocumentState(json, documentState)
      expandWhenNotInitialized(json)
      text = updatedText
      textIsRepaired = false
      parseError = undefined
    } catch (err) {
      try {
        json = parseMemoizeOne(jsonrepair(updatedText))
        documentState = syncDocumentState(json, documentState)
        expandWhenNotInitialized(json)
        text = updatedText
        textIsRepaired = true
        parseError = undefined
        clearSelectionWhenNotExisting(json)
      } catch {
        // no valid JSON, will show empty document or invalid json
        json = undefined
        documentState = undefined
        text = externalContent['text']
        textIsRepaired = false
        parseError =
          text !== undefined && text !== ''
            ? normalizeJsonParseError(text, (err as Error).message || String(err))
            : undefined
      }
    }

    clearSelectionWhenNotExisting(json)

    addHistoryItem(previousState)
  }

  function applyExternalSelection(externalSelection: JSONEditorSelection | undefined) {
    if (isEqual(selection, externalSelection)) {
      return
    }

    debug('applyExternalSelection', { selection, externalSelection })

    if (isJSONSelection(externalSelection)) {
      selection = externalSelection
    }
  }

  function expandWhenNotInitialized(json: unknown) {
    if (!documentStateInitialized) {
      documentStateInitialized = true
      documentState = expandSmart(json, documentState, [])
    }
  }

  function clearSelectionWhenNotExisting(json: unknown) {
    if (!selection) {
      return
    }

    if (existsIn(json, getAnchorPath(selection)) && existsIn(json, getFocusPath(selection))) {
      return
    }

    debug('clearing selection: path does not exist anymore', selection)
    selection = getInitialSelection(json, documentState)
  }

  interface PreviousState {
    json: unknown | undefined
    text: string | undefined
    documentState: DocumentState | undefined
    selection: JSONSelection | undefined
    textIsRepaired: boolean
  }

  function addHistoryItem(previous: PreviousState) {
    if (previous.json === undefined && previous.text === undefined) {
      // initialization -> do not create a history item
      return
    }

    const canPatch = json !== undefined && previous.json !== undefined

    history.add({
      type: 'tree',
      undo: {
        patch: canPatch ? [{ op: 'replace', path: '', value: previous.json }] : undefined,
        json: previous.json,
        text: previous.text,
        documentState: previous.documentState,
        textIsRepaired: previous.textIsRepaired,
        selection: removeEditModeFromSelection(previous.selection),
        sortedColumn: undefined
      },
      redo: {
        patch: canPatch ? [{ op: 'replace', path: '', value: json }] : undefined,
        json,
        text,
        documentState,
        textIsRepaired,
        selection: removeEditModeFromSelection(selection),
        sortedColumn: undefined
      }
    })
  }

  function createDefaultSelection() {
    debug('createDefaultSelection')

    selection = createValueSelection([])
  }

  export function patch(
    operations: JSONPatchDocument,
    afterPatch?: AfterPatchCallback
  ): JSONPatchResult {
    debug('patch', operations, afterPatch)

    if (json === undefined) {
      throw new Error('Cannot apply patch: no JSON')
    }

    const previousJson = json
    const previousState = {
      json: undefined, // not needed: we use patch to reconstruct the json
      text,
      documentState,
      selection: removeEditModeFromSelection(selection),
      textIsRepaired,
      sortedColumn: undefined
    }

    // execute the patch operations
    const undo: JSONPatchDocument = revertJSONPatchWithMoveOperations(
      json,
      operations
    ) as JSONPatchDocument
    const patched = documentStatePatch(json, documentState, operations)

    // update the selection based on the operations
    const updatedSelection = createSelectionFromOperations(json, operations) ?? selection

    const callback =
      typeof afterPatch === 'function'
        ? afterPatch(patched.json, patched.documentState, updatedSelection)
        : undefined

    json = callback?.json !== undefined ? callback.json : patched.json
    documentState = callback?.state !== undefined ? callback.state : patched.documentState
    selection = callback?.selection !== undefined ? callback.selection : updatedSelection
    text = undefined
    textIsRepaired = false
    pastedJson = undefined
    parseError = undefined

    // ensure the selection is valid
    clearSelectionWhenNotExisting(json)

    history.add({
      type: 'tree',
      undo: {
        patch: undo,
        ...previousState
      },
      redo: {
        patch: operations,
        json: undefined, // not needed, we use patch to reconstruct
        text,
        documentState,
        selection: removeEditModeFromSelection(selection),
        sortedColumn: undefined,
        textIsRepaired
      }
    })

    return {
      json,
      previousJson,
      undo,
      redo: operations
    }
  }

  // TODO: cleanup logging
  // $: debug('json', json)
  // $: debug('state', state)
  // $: debug('selection', selection)

  function handleEditKey() {
    if (readOnly || !selection) {
      return
    }

    selection = createEditKeySelection(getFocusPath(selection))
  }

  function handleEditValue() {
    if (readOnly || !selection) {
      return
    }

    const path = getFocusPath(selection)
    const value = getIn(json, path)
    if (isObjectOrArray(value)) {
      openJSONEditorModal(path, value)
    } else {
      selection = createEditValueSelection(path)
    }
  }

  function handleToggleEnforceString() {
    if (readOnly || !isValueSelection(selection)) {
      return
    }

    const path = getFocusPath(selection)
    const pointer = compileJSONPointer(path)
    const value = getIn(json, path)
    const enforceString = !getEnforceString(json, documentState, path)
    const updatedValue = enforceString ? String(value) : stringConvert(String(value), parser)

    debug('handleToggleEnforceString', { enforceString, value, updatedValue })

    handlePatch(
      [
        {
          op: 'replace',
          path: pointer,
          value: updatedValue
        }
      ],
      (_, patchedState) => {
        return {
          state: setInDocumentState(json, patchedState, path, { type: 'value', enforceString })
        }
      }
    )
  }

  export function acceptAutoRepair(): Content {
    if (textIsRepaired && json !== undefined) {
      handleReplaceJson(json)
    }

    return json !== undefined ? { json } : { text: text || '' }
  }

  async function handleCut(indent = true) {
    await onCut({
      json,
      selection,
      indentation: indent ? indentation : undefined,
      readOnly,
      parser,
      onPatch: handlePatch
    })
  }

  async function handleCopy(indent = true) {
    if (json === undefined) {
      return
    }

    await onCopy({
      json,
      selection,
      indentation: indent ? indentation : undefined,
      parser
    })
  }

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault()

    const clipboardText = event.clipboardData?.getData('text/plain') as string | undefined
    if (clipboardText === undefined) {
      return
    }

    onPaste({
      clipboardText,
      json,
      selection,
      readOnly,
      parser,
      onPatch: handlePatch,
      onChangeText: handleChangeText,
      openRepairModal
    })
  }

  function handlePasteFromMenu() {
    copyPasteModalOpen = true
  }

  function openRepairModal(text: string, onApply: (repairedText: string) => void) {
    jsonRepairModalProps = {
      text,
      onParse: (text) => parsePartialJson(text, (t) => parseAndRepair(t, parser)),
      onRepair: repairPartialJson,
      onApply,
      onClose: focus
    }
  }

  function handleRemove() {
    onRemove({
      json,
      text,
      selection,
      keepSelection: false,
      readOnly,
      onChange,
      onPatch: handlePatch
    })
  }

  function handleDuplicate() {
    if (
      readOnly ||
      json === undefined ||
      !selection ||
      !hasSelectionContents ||
      isEmpty(getFocusPath(selection)) // root selected, cannot duplicate
    ) {
      return
    }

    debug('duplicate', { selection })

    const operations = duplicate(json, getSelectionPaths(json, selection))

    handlePatch(operations)
  }

  function handleExtract() {
    if (
      readOnly ||
      !selection ||
      (!isMultiSelection(selection) && !isValueSelection(selection)) ||
      isEmpty(getFocusPath(selection)) // root selected, cannot extract
    ) {
      return
    }

    debug('extract', { selection })

    const operations = extract(json, selection)

    handlePatch(operations, (patchedJson, patchedState) => {
      if (isObjectOrArray(patchedJson)) {
        // expand extracted object/array
        const path: JSONPath = []
        return {
          state: expandSmartIfCollapsed(patchedJson, patchedState, path)
        }
      }

      return undefined
    })
  }

  function handleInsert(insertType: InsertType): void {
    onInsert({
      insertType,
      selectInside: true,
      initialValue: undefined,
      json,
      selection,
      readOnly,
      parser,
      onPatch: handlePatch,
      onReplaceJson: handleReplaceJson
    })
  }

  function handleInsertFromContextMenu(type: InsertType) {
    if (isKeySelection(selection)) {
      // in this case, we do not want to rename the key, but replace the property
      selection = createValueSelection(selection.path)
    }

    if (!selection) {
      selection = getInitialSelection(json, documentState)
    }

    handleInsert(type)
  }

  function handleConvert(type: ConvertType) {
    if (readOnly || !selection) {
      return
    }

    if (!canConvert(selection)) {
      onError(new Error(`Cannot convert current selection to ${type}`))
      return
    }

    try {
      const path = getAnchorPath(selection)
      const currentValue: unknown = getIn(json, path)
      const convertedValue = convertValue(
        currentValue,
        type as 'value' | 'object' | 'array',
        parser
      )
      if (convertedValue === currentValue) {
        // no change, do nothing
        return
      }

      const operations: JSONPatchDocument = [
        { op: 'replace', path: compileJSONPointer(path), value: convertedValue }
      ]

      debug('handleConvert', { selection, path, type, operations })

      handlePatch(operations, (patchedJson, patchedState) => {
        // expand converted object/array
        return {
          state: selection
            ? expandSmart(patchedJson, patchedState, getFocusPath(selection))
            : documentState
        }
      })
    } catch (err) {
      onError(err as Error)
    }
  }

  function handleInsertBefore() {
    if (!selection) {
      return
    }

    const selectionBefore = getSelectionUp(json, documentState, selection, false)
    const parentPath = initial(getFocusPath(selection))

    if (
      selectionBefore &&
      !isEmpty(getFocusPath(selectionBefore)) &&
      isEqual(parentPath, initial(getFocusPath(selectionBefore)))
    ) {
      selection = createAfterSelection(getFocusPath(selectionBefore))
    } else {
      selection = createInsideSelection(parentPath)
    }

    debug('insert before', { selection, selectionBefore, parentPath })

    tick().then(() => handleContextMenu())
  }

  function handleInsertAfter() {
    if (!selection) {
      return
    }

    const path = getEndPath(json, selection)

    debug('insert after', path)

    selection = createAfterSelection(path)

    tick().then(() => handleContextMenu())
  }

  async function handleInsertCharacter(char: string) {
    await onInsertCharacter({
      char,
      selectInside: true,
      json,
      selection,
      readOnly,
      parser,
      onPatch: handlePatch,
      onReplaceJson: handleReplaceJson,
      onSelect: handleSelect
    })
  }

  function handleUndo() {
    if (readOnly) {
      return
    }

    if (!history.canUndo) {
      return
    }

    const item = history.undo()
    if (!isTreeHistoryItem(item)) {
      onUndo(item)

      return
    }

    const previousContent = { json, text }

    json = item.undo.patch ? immutableJSONPatch(json, item.undo.patch) : item.undo.json
    documentState = item.undo.documentState
    selection = item.undo.selection
    text = item.undo.text
    textIsRepaired = item.undo.textIsRepaired
    parseError = undefined

    debug('undo', { item, json, documentState, selection })

    const patchResult =
      item.undo.patch && item.redo.patch
        ? {
            json,
            previousJson: previousContent.json,
            redo: item.undo.patch,
            undo: item.redo.patch
          }
        : undefined

    emitOnChange(previousContent, patchResult)

    focus()
    if (selection) {
      scrollTo(getFocusPath(selection), false)
    }
  }

  function handleRedo() {
    if (readOnly) {
      return
    }

    if (!history.canRedo) {
      return
    }

    const item = history.redo()
    if (!isTreeHistoryItem(item)) {
      onRedo(item)

      return
    }

    const previousContent = { json, text }

    json = item.redo.patch ? immutableJSONPatch(json, item.redo.patch) : item.redo.json
    documentState = item.redo.documentState
    selection = item.redo.selection
    text = item.redo.text
    textIsRepaired = item.redo.textIsRepaired
    parseError = undefined

    debug('redo', { item, json, documentState, selection })

    const patchResult =
      item.undo.patch && item.redo.patch
        ? {
            json,
            previousJson: previousContent.json,
            redo: item.redo.patch,
            undo: item.undo.patch
          }
        : undefined

    emitOnChange(previousContent, patchResult)

    focus()
    if (selection) {
      scrollTo(getFocusPath(selection), false)
    }
  }

  function openSortModal(rootPath: JSONPath) {
    if (readOnly || json === undefined) {
      return
    }

    modalOpen = true

    onSortModal({
      id: sortModalId,
      json,
      rootPath,
      onSort: async ({ operations }) => {
        debug('onSort', rootPath, operations)

        handlePatch(operations, (patchedJson, patchedState) => ({
          // expand the newly replaced array if needed, and select it
          state: expandSmartIfCollapsed(patchedJson, patchedState, rootPath),
          selection: createValueSelection(rootPath)
        }))
      },
      onClose: () => {
        modalOpen = false
        setTimeout(focus)
      }
    })
  }

  function handleSortSelection() {
    if (!selection) {
      return
    }

    const rootPath = findRootPath(json, selection)
    openSortModal(rootPath)
  }

  function handleSortAll() {
    const rootPath: JSONPath = []
    openSortModal(rootPath)
  }

  /**
   * This method is exposed via JSONEditor.transform
   */
  export function openTransformModal(options: TransformModalOptions) {
    if (json === undefined) {
      return
    }

    const { id, onTransform, onClose } = options
    const rootPath = options.rootPath || []

    modalOpen = true

    onTransformModal({
      id: id || transformModalId,
      json,
      rootPath,
      onTransform: (operations) => {
        if (onTransform) {
          onTransform({
            operations,
            json,
            transformedJson: immutableJSONPatch(json, operations)
          })
        } else {
          debug('onTransform', rootPath, operations)

          handlePatch(operations, (patchedJson, patchedState) => ({
            // expand the newly replaced array if needed and select it
            state: expandSmartIfCollapsed(patchedJson, patchedState, rootPath),
            selection: createValueSelection(rootPath)
          }))
        }
      },
      onClose: () => {
        modalOpen = false
        setTimeout(focus)
        if (onClose) {
          onClose()
        }
      }
    })
  }

  function handleTransformSelection() {
    if (!selection) {
      return
    }

    const rootPath = findRootPath(json, selection)
    openTransformModal({
      rootPath
    })
  }

  function handleTransformAll() {
    openTransformModal({
      rootPath: []
    })
  }

  function openJSONEditorModal(path: JSONPath, value: unknown) {
    debug('openJSONEditorModal', { path, value })

    modalOpen = true

    // open a popup where you can edit the nested object/array
    onJSONEditorModal({
      content: {
        json: value
      },
      path,
      onPatch: context.onPatch,
      onClose: () => {
        modalOpen = false
        setTimeout(focus)
      }
    })
  }

  /**
   * Scroll the window vertically to the node with given path.
   * Expand the path when needed.
   */
  export async function scrollTo(path: JSONPath, scrollToWhenVisible = true): Promise<void> {
    documentState = expandPath(json, documentState, path, expandNone)
    await tick() // await rerender (else the element we want to scroll to does not yet exist)

    const elem = findElement(path)

    debug('scrollTo', { path, elem, refContents })

    if (!elem || !refContents) {
      return Promise.resolve()
    }

    const viewPortRect = refContents.getBoundingClientRect()
    const elemRect = elem.getBoundingClientRect()
    if (!scrollToWhenVisible) {
      if (elemRect.bottom > viewPortRect.top && elemRect.top < viewPortRect.bottom) {
        // element is fully or partially visible, don't scroll to it
        return Promise.resolve()
      }
    }

    const offset = -(viewPortRect.height / 4)

    return new Promise<void>((resolve) => {
      jump(elem, {
        container: refContents,
        offset,
        duration: SCROLL_DURATION,
        callback: () => resolve()
      })
    })
  }

  /**
   * Find the DOM element of a given path.
   * Note that the path can only be found when the node is expanded.
   */
  export function findElement(path: JSONPath): Element | undefined {
    return refContents?.querySelector(`div[data-path="${encodeDataPath(path)}"]`) ?? undefined
  }

  /**
   * If given path is outside the visible viewport, scroll up/down.
   * When the path is already in view, nothing is done
   */
  function scrollIntoView(path: JSONPath) {
    const elem = findElement(path)

    if (!elem || !refContents) {
      return
    }

    const viewPortRect = refContents.getBoundingClientRect()
    const elemRect = elem.getBoundingClientRect()
    const margin = 20
    const elemHeight = isObjectOrArray(getIn(json, path))
      ? margin // do not use real height when array or object
      : elemRect.height

    if (elemRect.top < viewPortRect.top + margin) {
      // scroll down
      jump(elem, {
        container: refContents,
        offset: -margin,
        duration: 0
      })
    } else if (elemRect.top + elemHeight > viewPortRect.bottom - margin) {
      // scroll up
      jump(elem, {
        container: refContents,
        offset: -(viewPortRect.height - elemHeight - margin),
        duration: 0
      })
    }
  }

  function emitOnChange(previousContent: Content, patchResult: JSONPatchResult | undefined) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    if (previousContent.json === undefined && previousContent?.text === undefined) {
      // initialization -> do not fire an onChange event
      return
    }

    // make sure we cannot send an invalid contents like having both
    // json and text defined, or having none defined
    if (text !== undefined) {
      const content = { text, json: undefined }
      onChange?.(content, previousContent, {
        contentErrors: validate(),
        patchResult
      })
    } else if (json !== undefined) {
      const content = { text: undefined, json }
      onChange?.(content, previousContent, {
        contentErrors: validate(),
        patchResult
      })
    }
  }

  function handlePatch(
    operations: JSONPatchDocument,
    afterPatch?: AfterPatchCallback
  ): JSONPatchResult {
    debug('handlePatch', operations, afterPatch)

    const previousContent = { json, text }
    const patchResult = patch(operations, afterPatch)

    emitOnChange(previousContent, patchResult)

    return patchResult
  }

  function handleReplaceJson(updatedJson: unknown, afterPatch?: AfterPatchCallback) {
    const previousContent = { json, text }
    const previousState = { documentState, selection, json, text, textIsRepaired }

    const updatedState = expandPath(
      json,
      syncDocumentState(updatedJson, documentState),
      [],
      expandMinimal
    )

    const callback =
      typeof afterPatch === 'function'
        ? afterPatch(updatedJson, updatedState, selection)
        : undefined

    json = callback?.json !== undefined ? callback.json : updatedJson
    documentState = callback?.state !== undefined ? callback.state : updatedState
    selection = callback?.selection !== undefined ? callback.selection : selection
    text = undefined
    textIsRepaired = false
    parseError = undefined

    // make sure the selection is valid
    clearSelectionWhenNotExisting(json)

    addHistoryItem(previousState)

    // we could work out a patchResult, or use patch(), but only when the previous and new
    // contents are both json and not text. We go for simplicity and consistency here and
    // do _not_ return a patchResult ever.
    const patchResult = undefined

    emitOnChange(previousContent, patchResult)
  }

  function handleChangeText(updatedText: string, afterPatch?: AfterPatchCallback) {
    debug('handleChangeText')

    const previousContent = { json, text }
    const previousState = { documentState, selection, json, text, textIsRepaired }

    try {
      json = parseMemoizeOne(updatedText)
      documentState = expandPath(json, syncDocumentState(json, documentState), [], expandMinimal)
      text = undefined
      textIsRepaired = false
      parseError = undefined
    } catch (err) {
      try {
        json = parseMemoizeOne(jsonrepair(updatedText))
        documentState = expandPath(json, syncDocumentState(json, documentState), [], expandMinimal)
        text = updatedText
        textIsRepaired = true
        parseError = undefined
      } catch {
        // no valid JSON, will show empty document or invalid json
        json = undefined
        documentState = createDocumentState({ json, expand: expandMinimal })
        text = updatedText
        textIsRepaired = false
        parseError =
          text !== ''
            ? normalizeJsonParseError(text, (err as Error).message || String(err))
            : undefined
      }
    }

    if (typeof afterPatch === 'function') {
      const callback = afterPatch(json, documentState, selection)

      json = callback?.json !== undefined ? callback.json : json
      documentState = callback?.state !== undefined ? callback.state : documentState
      selection = callback?.selection !== undefined ? callback.selection : selection
    }

    // ensure the selection is valid
    clearSelectionWhenNotExisting(json)

    addHistoryItem(previousState)

    // no JSON patch actions available in text mode
    const patchResult = undefined

    emitOnChange(previousContent, patchResult)
  }

  /**
   * Toggle expanded state of a node
   * @param path The path to be expanded
   * @param expanded  True if currently expanded, false when currently collapsed
   * @param [recursive=false]  Only applicable when expanding
   */
  function handleExpand(path: JSONPath, expanded: boolean, recursive = false): void {
    debug('handleExpand', { path, expanded, recursive })

    if (expanded) {
      expand(path, recursive ? expandAll : expandSelf)
    } else {
      collapse(path, recursive)
    }

    // set focus to the hidden input, so we can capture quick keys like Ctrl+X, Ctrl+C, Ctrl+V
    focus()
  }

  function handleExpandAll() {
    handleExpand([], true, true)
  }

  function handleCollapseAll() {
    handleExpand([], false, true)
  }

  function openFind(findAndReplace: boolean): void {
    debug('openFind', { findAndReplace })

    showSearch = false
    showReplace = false

    tick().then(() => {
      // trick to make sure the focus goes to the search box
      showSearch = true
      showReplace = findAndReplace
    })
  }

  function handleExpandSection(path: JSONPath, section: Section) {
    debug('handleExpandSection', path, section)

    documentState = expandSection(json, documentState, path, section)
  }

  function handlePasteJson(newPastedJson: PastedJson) {
    debug('pasted json as text', newPastedJson)

    pastedJson = newPastedJson
  }

  function handleKeyDown(event: KeyboardEvent) {
    const combo = keyComboFromEvent(event)
    const keepAnchorPath = event.shiftKey
    debug('keydown', { combo, key: event.key })

    if (combo === 'Ctrl+X') {
      // cut formatted
      event.preventDefault()
      handleCut(true)
    }
    if (combo === 'Ctrl+Shift+X') {
      // cut compact
      event.preventDefault()
      handleCut(false)
    }
    if (combo === 'Ctrl+C') {
      // copy formatted
      event.preventDefault()
      handleCopy(true)
    }
    if (combo === 'Ctrl+Shift+C') {
      // copy compact
      event.preventDefault()
      handleCopy(false)
    }
    // Note: Ctrl+V (paste) is handled by the on:paste event

    if (combo === 'Ctrl+D') {
      event.preventDefault()
      handleDuplicate()
    }
    if (combo === 'Delete' || combo === 'Backspace') {
      event.preventDefault()
      handleRemove()
    }
    if (combo === 'Insert') {
      event.preventDefault()
      handleInsert('structure')
    }
    if (combo === 'Ctrl+A') {
      event.preventDefault()
      selection = selectAll()
    }

    if (combo === 'Ctrl+Q') {
      handleContextMenu(event)
    }

    if (combo === 'ArrowUp' || combo === 'Shift+ArrowUp') {
      event.preventDefault()

      const newSelection = selection
        ? getSelectionUp(json, documentState, selection, keepAnchorPath) || selection
        : getInitialSelection(json, documentState)

      selection = newSelection
      scrollIntoView(getFocusPath(newSelection))
    }
    if (combo === 'ArrowDown' || combo === 'Shift+ArrowDown') {
      event.preventDefault()

      const newSelection = selection
        ? getSelectionDown(json, documentState, selection, keepAnchorPath) || selection
        : getInitialSelection(json, documentState)

      selection = newSelection
      scrollIntoView(getFocusPath(newSelection))
    }
    if (combo === 'ArrowLeft' || combo === 'Shift+ArrowLeft') {
      event.preventDefault()

      const newSelection = selection
        ? getSelectionLeft(json, documentState, selection, keepAnchorPath, !readOnly) || selection
        : getInitialSelection(json, documentState)

      selection = newSelection
      scrollIntoView(getFocusPath(newSelection))
    }
    if (combo === 'ArrowRight' || combo === 'Shift+ArrowRight') {
      event.preventDefault()

      const newSelection =
        selection && json !== undefined
          ? getSelectionRight(json, documentState, selection, keepAnchorPath, !readOnly) ||
            selection
          : getInitialSelection(json, documentState)

      selection = newSelection
      scrollIntoView(getFocusPath(newSelection))
    }

    if (combo === 'Enter' && selection) {
      // when the selection consists of a single Array item, change selection to editing its value
      if (isMultiSelectionWithOneItem(selection)) {
        const path = selection.focusPath
        const parent = getIn(json, initial(path))
        if (Array.isArray(parent)) {
          // change into selection of the value
          event.preventDefault()
          selection = createValueSelection(path)
        }
      }

      if (isKeySelection(selection)) {
        // go to key edit mode
        event.preventDefault()
        selection = { ...selection, edit: true }
      }

      if (isValueSelection(selection)) {
        event.preventDefault()

        const value = getIn(json, selection.path)
        if (isObjectOrArray(value)) {
          // expand object/array
          handleExpand(selection.path, true)
        } else {
          // go to value edit mode
          selection = { ...selection, edit: true }
        }
      }
    }

    const normalizedCombo = combo.replace(/^Shift\+/, '') // replace 'Shift+A' with 'A'
    if (normalizedCombo.length === 1 && selection) {
      // a regular key like a, A, _, etc is entered.
      // Replace selected contents with a new value having this first character as text
      event.preventDefault()
      handleInsertCharacter(event.key)
      return
    }

    if (combo === 'Enter' && (isAfterSelection(selection) || isInsideSelection(selection))) {
      // Enter on an insert area -> open the area in edit mode
      event.preventDefault()
      handleInsertCharacter('')
      return
    }

    if (combo === 'Ctrl+Enter' && isValueSelection(selection)) {
      const value = getIn(json, selection.path)

      if (isUrl(value)) {
        // open url in new page
        window.open(String(value), '_blank')
      }
    }

    if (combo === 'Escape' && selection) {
      event.preventDefault()
      selection = undefined
    }

    if (combo === 'Ctrl+F') {
      event.preventDefault()
      openFind(false)
    }

    if (combo === 'Ctrl+H') {
      event.preventDefault()
      openFind(true)
    }

    if (combo === 'Ctrl+Z') {
      event.preventDefault()
      handleUndo()
    }

    if (combo === 'Ctrl+Shift+Z') {
      event.preventDefault()
      handleRedo()
    }
  }

  function handleMouseDown(event: Event) {
    debug('handleMouseDown', event)

    const target = event.target as HTMLElement

    if (!isChildOfNodeName(target, 'BUTTON') && !target.isContentEditable) {
      // for example when clicking on the empty area in the main menu
      focus()

      if (!selection && json === undefined && (text === '' || text === undefined)) {
        createDefaultSelection()
      }
    }
  }

  function openContextMenu({
    anchor,
    left,
    top,
    width,
    height,
    offsetTop,
    offsetLeft,
    showTip
  }: AbsolutePopupOptions) {
    const defaultItems: ContextMenuItem[] = createTreeContextMenuItems({
      json,
      documentState,
      selection,
      readOnly,

      onEditKey: handleEditKey,
      onEditValue: handleEditValue,
      onToggleEnforceString: handleToggleEnforceString,

      onCut: handleCut,
      onCopy: handleCopy,
      onPaste: handlePasteFromMenu,

      onRemove: handleRemove,
      onDuplicate: handleDuplicate,
      onExtract: handleExtract,

      onInsertBefore: handleInsertBefore,
      onInsert: handleInsertFromContextMenu,
      onInsertAfter: handleInsertAfter,
      onConvert: handleConvert,

      onSort: handleSortSelection,
      onTransform: handleTransformSelection
    })

    const items = onRenderContextMenu(defaultItems) ?? defaultItems

    if (items === false) {
      return
    }

    const props = {
      tip: showTip
        ? 'Tip: you can open this context menu via right-click or with Ctrl+Q'
        : undefined,
      items,
      onRequestClose: () => closeAbsolutePopup(popupId)
    }

    const options = {
      left,
      top,
      offsetTop,
      offsetLeft,
      width,
      height,
      anchor,
      closeOnOuterClick: true,
      onClose: () => {
        modalOpen = false
        focus()
      }
    }

    modalOpen = true

    const popupId = openAbsolutePopup(ContextMenu, props, options)
  }

  function handleContextMenu(event?: Event) {
    if (isEditingSelection(selection)) {
      return
    }

    if (event) {
      event.stopPropagation()
      event.preventDefault()
    }

    if (event && event.type === 'contextmenu' && event.target !== refHiddenInput) {
      // right mouse click to open context menu
      openContextMenu({
        left: (event as MouseEvent).clientX,
        top: (event as MouseEvent).clientY,
        width: CONTEXT_MENU_WIDTH,
        height: CONTEXT_MENU_HEIGHT,
        showTip: false
      })
    } else {
      // type === 'keydown' (from the quick key Ctrl+Q)
      // or target is hidden input -> context menu button on keyboard
      const anchor = refContents?.querySelector('.jse-context-menu-pointer.jse-selected')
      if (anchor) {
        openContextMenu({
          anchor,
          offsetTop: 2,
          width: CONTEXT_MENU_WIDTH,
          height: CONTEXT_MENU_HEIGHT,
          showTip: false
        })
      } else {
        // fallback on just displaying the TreeContextMenu top left
        const rect = refContents?.getBoundingClientRect()
        if (rect) {
          openContextMenu({
            top: rect.top + 2,
            left: rect.left + 2,
            width: CONTEXT_MENU_WIDTH,
            height: CONTEXT_MENU_HEIGHT,
            showTip: false
          })
        }
      }
    }
  }

  function handleContextMenuFromTreeMenu(event: MouseEvent) {
    openContextMenu({
      anchor: findParentWithNodeName(event.target as HTMLElement, 'BUTTON'),
      offsetTop: 0,
      width: CONTEXT_MENU_WIDTH,
      height: CONTEXT_MENU_HEIGHT,
      showTip: true
    })
  }

  async function handleParsePastedJson() {
    debug('apply pasted json', pastedJson)
    if (!pastedJson) {
      return
    }

    const { onPasteAsJson } = pastedJson
    pastedJson = undefined

    onPasteAsJson()

    // TODO: get rid of the setTimeout here
    setTimeout(focus)
  }

  function handleClearPastedJson() {
    debug('clear pasted json')
    pastedJson = undefined
    focus()
  }

  function handleRequestRepair() {
    onChangeMode(Mode.text)
  }

  function handleNavigationBarSelect(newSelection: JSONSelection) {
    selection = newSelection

    focus()
    scrollTo(getFocusPath(newSelection))
  }

  export function focus() {
    debug('focus')
    // with just .focus(), sometimes the input doesn't react on onpaste events
    // in Chrome when having a large document open and then doing cut/paste.
    // Calling both .focus() and .select() did solve this issue.
    if (refHiddenInput) {
      refHiddenInput.focus()
      refHiddenInput.select()
    }
  }

  function handleWindowMouseDown(event: MouseEvent & { currentTarget: EventTarget & Window }) {
    const outsideEditor = !isChildOf(
      event.target as Element,
      (element) => element === refJsonEditor
    )
    if (outsideEditor) {
      if (isEditingSelection(selection)) {
        debug('click outside the editor, exit edit mode')
        selection = removeEditModeFromSelection(selection)

        if (hasFocus && refHiddenInput) {
          refHiddenInput.focus()
          refHiddenInput.blur()
        }

        debug('blur (outside editor)')
        if (refHiddenInput) {
          refHiddenInput.blur()
        }
      }
    }
  }

  function findNextInside(path: JSONPath): JSONSelection | undefined {
    return getSelectionNextInside(json, documentState, path)
  }

  $: autoScrollHandler = refContents ? createAutoScrollHandler(refContents) : undefined

  function handleDrag(event: MouseEvent) {
    if (autoScrollHandler) {
      autoScrollHandler.onDrag(event)
    }
  }

  function handleDragEnd() {
    if (autoScrollHandler) {
      autoScrollHandler.onDragEnd()
    }
  }

  // Note that we want the context to change as little as possible since it forces all nodes to re-render,
  // it should only change when a config option like readOnly or onClassName is changed
  let context: TreeModeContext
  $: context = {
    mode: Mode.tree,
    readOnly,
    parser,
    normalization,
    getJson,
    getDocumentState,
    getSelection,
    findElement,
    findNextInside,
    focus,
    onPatch: handlePatch,
    onInsert: handleInsert,
    onExpand: handleExpand,
    onSelect: handleSelect,
    onFind: openFind,
    onExpandSection: handleExpandSection,
    onPasteJson: handlePasteJson,
    onRenderValue,
    onContextMenu: openContextMenu,
    onClassName: onClassName || (() => undefined),
    onDrag: handleDrag,
    onDragEnd: handleDragEnd
  }

  $: debug('context changed', context)
</script>

<svelte:window on:mousedown={handleWindowMouseDown} />

<div
  role="tree"
  tabindex="-1"
  class="jse-tree-mode"
  class:no-main-menu={!mainMenuBar}
  on:keydown={handleKeyDown}
  on:mousedown={handleMouseDown}
  on:contextmenu={handleContextMenu}
  bind:this={refJsonEditor}
>
  {#if mainMenuBar}
    <TreeMenu
      {json}
      {selection}
      {readOnly}
      {history}
      bind:showSearch
      onExpandAll={handleExpandAll}
      onCollapseAll={handleCollapseAll}
      onUndo={handleUndo}
      onRedo={handleRedo}
      onSort={handleSortAll}
      onTransform={handleTransformAll}
      onContextMenu={handleContextMenuFromTreeMenu}
      onCopy={handleCopy}
      {onRenderMenu}
    />
  {/if}

  {#if navigationBar}
    <NavigationBar {json} {selection} onSelect={handleNavigationBarSelect} {onError} {pathParser} />
  {/if}

  {#if !isSSR}
    <label class="jse-hidden-input-label">
      <input
        type="text"
        readonly={true}
        tabindex="-1"
        class="jse-hidden-input"
        bind:this={refHiddenInput}
        on:paste={handlePaste}
      />
    </label>
    {#if json === undefined}
      {#if text === '' || text === undefined}
        <Welcome
          {readOnly}
          onCreateObject={() => {
            focus()
            handleInsertCharacter('{')
          }}
          onCreateArray={() => {
            focus()
            handleInsertCharacter('[')
          }}
          onClick={() => {
            // FIXME: this is a workaround for the editor not putting the focus on refHiddenInput
            //  when clicking in the welcome screen so you cannot paste a document from clipboard.
            focus()
          }}
        />
      {:else}
        <Message
          type="error"
          message="The loaded JSON document is invalid and could not be repaired automatically."
          actions={!readOnly
            ? [
                {
                  icon: faCode,
                  text: 'Repair manually',
                  title: 'Open the document in "code" mode and repair it manually',
                  onClick: handleRequestRepair
                }
              ]
            : []}
        />
        <JSONPreview {text} {json} {indentation} {parser} />
      {/if}
    {:else}
      <div class="jse-search-box-container">
        <SearchBox
          {json}
          {documentState}
          {parser}
          {showSearch}
          {showReplace}
          {readOnly}
          columns={undefined}
          onSearch={handleSearch}
          onFocus={handleFocusSearch}
          onPatch={handlePatch}
          onClose={handleCloseSearch}
        />
      </div>
      <div class="jse-contents" data-jsoneditor-scrollable-contents={true} bind:this={refContents}>
        {#if showSearch}
          <div class="jse-search-box-background"></div>
        {/if}
        <JSONNode
          value={json}
          pointer={''}
          state={documentState}
          {validationErrors}
          {searchResults}
          {selection}
          {context}
          onDragSelectionStart={noop}
        />
      </div>

      {#if pastedJson}
        <Message
          type="info"
          message={`You pasted a JSON ${
            Array.isArray(pastedJson.contents) ? 'array' : 'object'
          } as text`}
          actions={[
            {
              icon: faWrench,
              text: 'Paste as JSON instead',
              title: 'Replace the value with the pasted JSON',
              // We use mousedown here instead of click: this message pops up
              // whilst the user is editing a value. When clicking this button,
              // the actual value is applied and the event is not propagated
              // and an onClick on this button never happens.
              onMouseDown: handleParsePastedJson
            },
            {
              text: 'Leave as is',
              title: 'Keep the JSON embedded in the value',
              onClick: handleClearPastedJson
            }
          ]}
        />
      {/if}

      {#if textIsRepaired}
        <Message
          type="success"
          message="The loaded JSON document was invalid but is successfully repaired."
          actions={!readOnly
            ? [
                {
                  icon: faCheck,
                  text: 'Ok',
                  title: 'Accept the repaired document',
                  onClick: acceptAutoRepair
                },
                {
                  icon: faCode,
                  text: 'Repair manually instead',
                  title: 'Leave the document unchanged and repair it manually instead',
                  onClick: handleRequestRepair
                }
              ]
            : []}
          onClose={focus}
        />
      {/if}

      <ValidationErrorsOverview
        validationErrors={validationErrorList}
        selectError={handleSelectValidationError}
      />
    {/if}
  {:else}
    <div class="jse-contents">
      <div class="jse-loading-space"></div>
      <div class="jse-loading">loading...</div>
    </div>
  {/if}
</div>

{#if copyPasteModalOpen}
  <CopyPasteModal onClose={() => (copyPasteModalOpen = false)} />
{/if}

{#if jsonRepairModalProps}
  <JSONRepairModal
    {...jsonRepairModalProps}
    onClose={() => {
      jsonRepairModalProps?.onClose()
      jsonRepairModalProps = undefined
    }}
  />
{/if}

<style src="./TreeMode.scss"></style>
