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
    SEARCH_BOX_HEIGHT,
    SIMPLE_MODAL_OPTIONS
  } from '$lib/constants.js'
  import {
    collapsePath,
    createDocumentState,
    documentStatePatch,
    expandAll,
    expandMinimal,
    expandPath,
    expandRecursive,
    expandSection,
    expandSingleItem,
    expandWithCallback,
    getDefaultExpand,
    getEnforceString,
    setInDocumentState,
    syncDocumentState
  } from '$lib/logic/documentState.js'
  import { createHistory } from '$lib/logic/history.js'
  import { duplicate, extract, revertJSONPatchWithMoveOperations } from '$lib/logic/operations.js'
  import {
    canConvert,
    createAfterSelection,
    createInsideSelection,
    createKeySelection,
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
    isChildOfNodeName,
    isEditableDivRef
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
    HistoryItem,
    InsertType,
    JSONEditorSelection,
    JSONParser,
    JSONPatchResult,
    JSONPathParser,
    JSONSelection,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnClassName,
    OnError,
    OnExpand,
    OnFocus,
    OnJSONEditorModal,
    OnRenderContextMenuInternal,
    OnRenderMenuInternal,
    OnRenderValue,
    OnSelect,
    OnSortModal,
    OnTransformModal,
    ParseError,
    PastedJson,
    RecursiveSearchResult,
    RecursiveValidationErrors,
    SearchResult,
    Section,
    TransformModalOptions,
    TreeModeContext,
    ValidationError,
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
  import type { Context } from 'svelte-simple-modal'
  import ContextMenu from '../../controls/contextmenu/ContextMenu.svelte'
  import createTreeContextMenuItems from './contextmenu/createTreeContextMenuItems'
  import { toRecursiveSearchResult as toRecursiveSearchResult } from 'svelte-jsoneditor/logic/search.js'

  const debug = createDebug('jsoneditor:TreeMode')

  const isSSR = typeof window === 'undefined'
  debug('isSSR:', isSSR)

  const { open } = getContext<Context>('simple-modal')
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
  export let externalSelection: JSONEditorSelection | null
  export let mainMenuBar: boolean
  export let navigationBar: boolean
  export let escapeControlCharacters: boolean
  export let escapeUnicodeCharacters: boolean
  export let parser: JSONParser
  export let parseMemoizeOne: JSONParser['parse']
  export let validator: Validator | null
  export let validationParser: JSONParser
  export let pathParser: JSONPathParser
  export let indentation: number | string
  export let onError: OnError
  export let onChange: OnChange
  export let onChangeMode: OnChangeMode
  export let onSelect: OnSelect
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
  let selection: JSONSelection | null

  function updateSelection(
    updatedSelection:
      | JSONSelection
      | null
      | ((selection: JSONSelection | null) => JSONSelection | null | undefined | void)
  ) {
    debug('updateSelection', updatedSelection)

    const appliedSelection =
      typeof updatedSelection === 'function'
        ? updatedSelection(selection) || null
        : updatedSelection

    if (!isEqual(appliedSelection, selection)) {
      selection = appliedSelection

      onSelect(appliedSelection)
    }
  }

  let normalization: ValueNormalization
  $: normalization = createNormalizationFunctions({
    escapeControlCharacters,
    escapeUnicodeCharacters
  })

  $: debug('selection', selection)

  let pastedJson: PastedJson

  let searchResult: SearchResult | undefined
  let recursiveSearchResult: RecursiveSearchResult | undefined
  let showSearch = false
  let showReplace = false

  $: applySearchBoxSpacing(showSearch)

  function applySearchBoxSpacing(showSearch: boolean) {
    if (!refContents) {
      return
    }

    if (showSearch) {
      const padding = parseInt(getComputedStyle(refContents).padding) ?? 0
      refContents.style.overflowAnchor = 'none'
      refContents.style.paddingTop = padding + SEARCH_BOX_HEIGHT + 'px'
      refContents.scrollTop += SEARCH_BOX_HEIGHT
      refContents.style.overflowAnchor = ''
    } else {
      refContents.style.overflowAnchor = 'none'
      refContents.style.paddingTop = ''
      refContents.scrollTop -= SEARCH_BOX_HEIGHT
      refContents.style.overflowAnchor = ''
    }
  }

  function handleSearch(result: SearchResult | undefined) {
    searchResult = result
    recursiveSearchResult = searchResult
      ? toRecursiveSearchResult(json, searchResult.items)
      : undefined
  }

  async function handleFocusSearch(path: JSONPath) {
    documentState = expandPath(json, documentState, path)
    null // navigation path of current selection would be confusing
    await scrollTo(path)
  }

  function handleCloseSearch() {
    showSearch = false
    showReplace = false
    focus()
  }

  function handleSelectValidationError(error: ValidationError) {
    debug('select validation error', error)

    updateSelection(createValueSelection(error.path, false))
    scrollTo(error.path)
  }

  const history = createHistory<HistoryItem>({
    onChange: (state) => {
      historyState = state
    }
  })
  let historyState = history.getState()

  export function expand(callback: OnExpand = expandAll) {
    debug('expand')

    // FIXME: clear the expanded state and visible sections (else you can't collapse anything using the callback)
    documentState = expandWithCallback(json, documentState, [], callback)
  }

  // two-way binding of externalContent and internal json and text (
  // when receiving an updated prop, we have to update state for example
  $: applyExternalContent(externalContent)

  $: applyExternalSelection(externalSelection)

  let textIsRepaired = false

  let validationErrors: ValidationError[] = []
  let recursiveValidationErrors: RecursiveValidationErrors | undefined

  $: updateValidationErrors(json, validator, parser, validationParser)

  // because onChange returns the validation errors and there is also a separate listener,
  // we would execute validation twice. Memoizing the last result solves this.
  const memoizedValidate = memoizeOne(validateJSON)

  function updateValidationErrors(
    json: unknown,
    validator: Validator | null,
    parser: JSONParser,
    validationParser: JSONParser
  ) {
    measure(
      () => {
        let newValidationErrors: ValidationError[]
        try {
          newValidationErrors = memoizedValidate(json, validator, parser, validationParser)
        } catch (err) {
          newValidationErrors = [
            {
              path: [],
              message: 'Failed to validate: ' + (err as Error).message,
              severity: ValidationSeverity.warning
            }
          ]
        }

        if (!isEqual(newValidationErrors, validationErrors)) {
          debug('validationErrors changed:', newValidationErrors)
          validationErrors = newValidationErrors
          recursiveValidationErrors = toRecursiveValidationErrors(json, validationErrors)
        }
      },
      (duration) => debug(`validationErrors updated in ${duration} ms`)
    )
  }

  export function validate(): ContentErrors | null {
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
    return !isEmpty(validationErrors) ? { validationErrors } : null
  }

  export function getJson() {
    return json
  }

  function getDocumentState(): DocumentState | undefined {
    return documentState
  }

  function getSelection(): JSONSelection | null {
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

    const previousState = documentState
    const previousSelection = selection
    const previousJson = json
    const previousText = text
    const previousTextIsRepaired = textIsRepaired

    json = updatedJson
    documentState = syncDocumentState(updatedJson, documentState)
    expandWhenNotInitialized(json)
    text = undefined
    textIsRepaired = false
    parseError = undefined
    clearSelectionWhenNotExisting(json)

    addHistoryItem({
      previousJson,
      previousState,
      previousSelection,
      previousText,
      previousTextIsRepaired
    })
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

    const previousJson = json
    const previousState = documentState
    const previousSelection = selection
    const previousText = text
    const previousTextIsRepaired = textIsRepaired

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
      } catch (repairError) {
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

    addHistoryItem({
      previousJson,
      previousState,
      previousSelection,
      previousText,
      previousTextIsRepaired
    })
  }

  function applyExternalSelection(externalSelection: JSONEditorSelection | null) {
    if (isEqual(selection, externalSelection)) {
      return
    }

    debug('applyExternalSelection', externalSelection)

    if (isJSONSelection(externalSelection) || externalSelection === null) {
      updateSelection(externalSelection)
    }
  }

  function expandWhenNotInitialized(json: unknown) {
    if (!documentStateInitialized) {
      documentStateInitialized = true
      documentState = createDocumentState({ json, expand: getDefaultExpand(json) })
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

  function addHistoryItem({
    previousJson,
    previousState,
    previousSelection,
    previousText,
    previousTextIsRepaired
  }: {
    previousJson: unknown | undefined
    previousText: string | undefined
    previousState: DocumentState | undefined
    previousSelection: JSONSelection | null
    previousTextIsRepaired: boolean
  }) {
    if (previousJson === undefined && previousText === undefined) {
      // initialization -> do not create a history item
      return
    }

    if (json !== undefined) {
      if (previousJson !== undefined) {
        // regular undo/redo with JSON patch
        history.add({
          undo: {
            patch: [{ op: 'replace', path: '', value: previousJson }],
            state: previousState,
            selection: removeEditModeFromSelection(previousSelection),
            sortedColumn: null,
            json: undefined,
            text: previousText,
            textIsRepaired: previousTextIsRepaired
          },
          redo: {
            patch: [{ op: 'replace', path: '', value: json }],
            state: documentState,
            selection: removeEditModeFromSelection(selection),
            sortedColumn: null,
            json: undefined,
            text,
            textIsRepaired
          }
        })
      } else {
        history.add({
          undo: {
            patch: undefined,
            json: undefined,
            text: previousText,
            state: previousState,
            selection: removeEditModeFromSelection(previousSelection),
            sortedColumn: null,
            textIsRepaired: previousTextIsRepaired
          },
          redo: {
            patch: undefined,
            json,
            state: documentState,
            selection: removeEditModeFromSelection(selection),
            sortedColumn: null,
            text,
            textIsRepaired
          }
        })
      }
    } else {
      if (previousJson !== undefined) {
        history.add({
          undo: {
            patch: undefined,
            json: previousJson,
            state: previousState,
            selection: removeEditModeFromSelection(previousSelection),
            sortedColumn: null,
            text: previousText,
            textIsRepaired: previousTextIsRepaired
          },
          redo: {
            patch: undefined,
            json: undefined,
            text,
            textIsRepaired,
            state: documentState,
            selection: removeEditModeFromSelection(selection),
            sortedColumn: null
          }
        })
      } else {
        // this cannot happen. Nothing to do, no change
      }
    }
  }

  function createDefaultSelection() {
    debug('createDefaultSelection')

    selection = createValueSelection([], false)
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
    const previousState = documentState
    const previousSelection = selection
    const previousText = text
    const previousTextIsRepaired = textIsRepaired

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
        ? afterPatch(patched.json, patched.state, updatedSelection)
        : undefined

    json = callback?.json !== undefined ? callback.json : patched.json
    documentState = callback?.state !== undefined ? callback.state : patched.state
    selection = callback?.selection !== undefined ? callback.selection : updatedSelection
    text = undefined
    textIsRepaired = false
    pastedJson = undefined
    parseError = undefined

    debug('patch', { updatedSelection, documentState2: documentState })

    // ensure the selection is valid
    clearSelectionWhenNotExisting(json)

    history.add({
      undo: {
        patch: undo,
        json: undefined,
        text: previousText,
        state: previousState,
        selection: removeEditModeFromSelection(previousSelection),
        sortedColumn: null,
        textIsRepaired: previousTextIsRepaired
      },
      redo: {
        patch: operations,
        json: undefined,
        state: documentState,
        selection: removeEditModeFromSelection(selection),
        sortedColumn: null,
        text,
        textIsRepaired
      }
    })

    const patchResult = {
      json,
      previousJson,
      undo,
      redo: operations
    }

    return patchResult
  }

  // TODO: cleanup logging
  // $: debug('json', json)
  // $: debug('state', state)
  // $: debug('selection', selection)

  function handleEditKey() {
    if (readOnly || !selection) {
      return
    }

    updateSelection(createKeySelection(getFocusPath(selection), true))
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
      updateSelection(createValueSelection(path, true))
    }
  }

  function handleToggleEnforceString() {
    if (readOnly || !isValueSelection(selection)) {
      return
    }

    const path = getFocusPath(selection)
    const pointer = compileJSONPointer(path)
    const value = getIn(json, path)
    const enforceString = !getEnforceString(json, documentState, path, parser)
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
    open(
      CopyPasteModal,
      {},
      {
        ...SIMPLE_MODAL_OPTIONS,
        styleWindow: {
          width: '450px'
        }
      },
      {
        onClose: () => focus()
      }
    )
  }

  function openRepairModal(text: string, onApply: (repairedText: string) => void) {
    open(
      JSONRepairModal,
      {
        text,
        onParse: (text: string) => parsePartialJson(text, (t) => parseAndRepair(t, parser)),
        onRepair: repairPartialJson,
        onApply
      },
      {
        ...SIMPLE_MODAL_OPTIONS,
        styleWindow: {
          width: '600px',
          height: '500px'
        },
        styleContent: {
          padding: 0,
          height: '100%'
        }
      },
      {
        onClose: () => focus()
      }
    )
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
          state: expandRecursive(patchedJson, patchedState, path)
        }
      }
    })
  }

  function handleInsert(insertType: InsertType): void {
    onInsert({
      insertType,
      selectInside: true,
      refJsonEditor,
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
      updateSelection(createValueSelection(selection.path, false))
    }

    if (!selection) {
      updateSelection(getInitialSelection(json, documentState))
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
            ? expandRecursive(patchedJson, patchedState, getFocusPath(selection))
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
      updateSelection(createAfterSelection(getFocusPath(selectionBefore)))
    } else {
      updateSelection(createInsideSelection(parentPath))
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

    updateSelection(createAfterSelection(path))

    tick().then(() => handleContextMenu())
  }

  async function handleInsertCharacter(char: string) {
    await onInsertCharacter({
      char,
      selectInside: true,
      refJsonEditor,
      json,
      selection,
      readOnly,
      parser,
      onPatch: handlePatch,
      onReplaceJson: handleReplaceJson,
      onSelect: updateSelection
    })
  }

  function handleUndo() {
    if (readOnly) {
      return
    }

    if (!history.getState().canUndo) {
      return
    }

    const item = history.undo()
    if (!item) {
      return
    }

    const previousContent = { json, text }

    json = item.undo.patch ? immutableJSONPatch(json, item.undo.patch) : item.undo.json
    documentState = item.undo.state
    selection = item.undo.selection
    text = item.undo.text
    textIsRepaired = item.undo.textIsRepaired
    parseError = undefined

    debug('undo', { item, json, documentState2: documentState, selection })

    const patchResult =
      item.undo.patch && item.redo.patch
        ? {
            json,
            previousJson: previousContent.json,
            redo: item.undo.patch,
            undo: item.redo.patch
          }
        : null

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

    if (!history.getState().canRedo) {
      return
    }

    const item = history.redo()
    if (!item) {
      return
    }

    const previousContent = { json, text }

    json = item.redo.patch ? immutableJSONPatch(json, item.redo.patch) : item.redo.json
    documentState = item.redo.state
    selection = item.redo.selection
    text = item.redo.text
    textIsRepaired = item.redo.textIsRepaired
    parseError = undefined

    debug('redo', { item, json, documentState2: documentState, selection })

    const patchResult =
      item.undo.patch && item.redo.patch
        ? {
            json,
            previousJson: previousContent.json,
            redo: item.redo.patch,
            undo: item.undo.patch
          }
        : null

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
          // expand the newly replaced array and select it
          state: expandRecursive(patchedJson, patchedState, rootPath),
          selection: createValueSelection(rootPath, false)
        }))
      },
      onClose: () => {
        modalOpen = false
        focus()
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
            // expand the newly replaced array and select it
            state: expandRecursive(patchedJson, patchedState, rootPath),
            selection: createValueSelection(rootPath, false)
          }))
        }
      },
      onClose: () => {
        modalOpen = false
        focus()
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
        focus()
      }
    })
  }

  /**
   * Scroll the window vertically to the node with given path.
   * Expand the path when needed.
   */
  export async function scrollTo(path: JSONPath, scrollToWhenVisible = true): Promise<void> {
    documentState = expandPath(json, documentState, path)
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
  export function findElement(path: JSONPath): Element | null {
    return refContents
      ? refContents.querySelector(`div[data-path="${encodeDataPath(path)}"]`)
      : null
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

  function emitOnChange(previousContent: Content, patchResult: JSONPatchResult | null) {
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
    const previousState = documentState
    const previousSelection = selection
    const previousJson = json
    const previousText = text
    const previousContent = { json, text }
    const previousTextIsRepaired = textIsRepaired

    const updatedState = expandWithCallback(
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

    addHistoryItem({
      previousJson,
      previousState,
      previousSelection,
      previousText,
      previousTextIsRepaired
    })

    // we could work out a patchResult, or use patch(), but only when the previous and new
    // contents are both json and not text. We go for simplicity and consistency here and
    // do _not_ return a patchResult ever.
    const patchResult = null

    emitOnChange(previousContent, patchResult)
  }

  function handleChangeText(updatedText: string, afterPatch?: AfterPatchCallback) {
    debug('handleChangeText')

    const previousState = documentState
    const previousSelection = selection
    const previousJson = json
    const previousText = text
    const previousContent = { json, text }
    const previousTextIsRepaired = textIsRepaired

    try {
      json = parseMemoizeOne(updatedText)
      documentState = expandWithCallback(
        json,
        syncDocumentState(json, documentState),
        [],
        expandMinimal
      )
      text = undefined
      textIsRepaired = false
      parseError = undefined
    } catch (err) {
      try {
        json = parseMemoizeOne(jsonrepair(updatedText))
        documentState = expandWithCallback(
          json,
          syncDocumentState(json, documentState),
          [],
          expandMinimal
        )
        text = updatedText
        textIsRepaired = true
        parseError = undefined
      } catch (repairError) {
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

    addHistoryItem({
      previousJson,
      previousState,
      previousSelection,
      previousText,
      previousTextIsRepaired
    })

    // no JSON patch actions available in text mode
    const patchResult = null

    emitOnChange(previousContent, patchResult)
  }

  /**
   * Toggle expanded state of a node
   * @param path The path to be expanded
   * @param expanded  True to expand, false to collapse
   * @param [recursive=false]  Only applicable when expanding
   */
  function handleExpand(path: JSONPath, expanded: boolean, recursive = false): void {
    debug('handleExpand', { path, expanded, recursive })

    if (expanded) {
      if (recursive) {
        documentState = expandWithCallback(json, documentState, path, expandAll)
      } else {
        documentState = expandSingleItem(json, documentState, path)
      }
    } else {
      documentState = collapsePath(json, documentState, path)

      if (selection) {
        // check whether the selection is still visible and not collapsed
        if (isSelectionInsidePath(selection, path)) {
          // remove selection when not visible anymore
          updateSelection(null)
        }
      }
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
      updateSelection(selectAll())
    }

    if (combo === 'Ctrl+Q') {
      handleContextMenu(event)
    }

    if (combo === 'ArrowUp' || combo === 'Shift+ArrowUp') {
      event.preventDefault()

      const newSelection = selection
        ? getSelectionUp(json, documentState, selection, keepAnchorPath) || selection
        : getInitialSelection(json, documentState)

      updateSelection(newSelection)
      scrollIntoView(getFocusPath(newSelection))
    }
    if (combo === 'ArrowDown' || combo === 'Shift+ArrowDown') {
      event.preventDefault()

      const newSelection = selection
        ? getSelectionDown(json, documentState, selection, keepAnchorPath) || selection
        : getInitialSelection(json, documentState)

      updateSelection(newSelection)
      scrollIntoView(getFocusPath(newSelection))
    }
    if (combo === 'ArrowLeft' || combo === 'Shift+ArrowLeft') {
      event.preventDefault()

      const newSelection = selection
        ? getSelectionLeft(json, documentState, selection, keepAnchorPath, !readOnly) || selection
        : getInitialSelection(json, documentState)

      updateSelection(newSelection)
      scrollIntoView(getFocusPath(newSelection))
    }
    if (combo === 'ArrowRight' || combo === 'Shift+ArrowRight') {
      event.preventDefault()

      const newSelection =
        selection && json !== undefined
          ? getSelectionRight(json, documentState, selection, keepAnchorPath, !readOnly) ||
            selection
          : getInitialSelection(json, documentState)

      updateSelection(newSelection)
      scrollIntoView(getFocusPath(newSelection))
    }

    if (combo === 'Enter' && selection) {
      // when the selection consists of a single Array item, change selection to editing its value
      if (isMultiSelectionWithOneItem(selection)) {
        const path = selection.focusPath
        const parent = getIn(json, initial(path))
        if (Array.isArray(parent)) {
          // change into selection of the value
          updateSelection(createValueSelection(path, false))
        }
      }

      if (isKeySelection(selection)) {
        // go to key edit mode
        event.preventDefault()
        updateSelection({ ...selection, edit: true })
      }

      if (isValueSelection(selection)) {
        event.preventDefault()

        const value = getIn(json, selection.path)
        if (isObjectOrArray(value)) {
          // expand object/array
          handleExpand(selection.path, true)
        } else {
          // go to value edit mode
          updateSelection({ ...selection, edit: true })
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
      updateSelection(null)
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
      parser,

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

    const items = onRenderContextMenu(defaultItems)

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

    return false
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

    const { path, contents } = pastedJson
    pastedJson = undefined

    // exit edit mode
    const refEditableDiv = refContents?.querySelector('.jse-editable-div') || null
    if (isEditableDivRef(refEditableDiv)) {
      refEditableDiv.cancel()
    }

    // replace the value with the JSON object/array
    const operations: JSONPatchDocument = [
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value: contents
      }
    ]

    handlePatch(operations, (patchedJson, patchedState) => {
      return {
        state: expandRecursive(patchedJson, patchedState, path)
      }
    })

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
    updateSelection(newSelection)

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
        debug('click outside the editor, stop edit mode')
        updateSelection((selection) => {
          if (isKeySelection(selection)) {
            return { ...selection, edit: false }
          } else if (isValueSelection(selection)) {
            return { ...selection, edit: false }
          } else {
            return selection
          }
        })

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

  function findNextInside(path: JSONPath): JSONSelection | null {
    return getSelectionNextInside(json, documentState, selection, path)
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
    onSelect: updateSelection,
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
      {historyState}
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
        <JSONNode
          value={json}
          pointer={''}
          state={documentState}
          {recursiveValidationErrors}
          {recursiveSearchResult}
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

      <ValidationErrorsOverview {validationErrors} selectError={handleSelectValidationError} />
    {/if}
  {:else}
    <div class="jse-contents">
      <div class="jse-loading-space" />
      <div class="jse-loading">loading...</div>
    </div>
  {/if}
</div>

<style src="./TreeMode.scss"></style>
