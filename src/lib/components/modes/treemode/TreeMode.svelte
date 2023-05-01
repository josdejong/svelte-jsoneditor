<svelte:options immutable={true} />

<script lang="ts">
  import { createAutoScrollHandler } from '../../controls/createAutoScrollHandler.js'
  import { faCheck, faCode, faWrench } from '@fortawesome/free-solid-svg-icons'
  import { createDebug } from '$lib/utils/debug.js'
  import type { JSONPatchDocument, JSONPath, JSONValue } from 'immutable-json-patch'
  import { compileJSONPointer, existsIn, getIn, immutableJSONPatch } from 'immutable-json-patch'
  import { jsonrepair } from 'jsonrepair'
  import { initial, isEmpty, isEqual, last, noop, throttle, uniqueId } from 'lodash-es'
  import { getContext, onDestroy, onMount, tick } from 'svelte'
  import { createJump } from '$lib/assets/jump.js/src/jump.js'
  import {
    CONTEXT_MENU_HEIGHT,
    CONTEXT_MENU_WIDTH,
    MAX_SEARCH_RESULTS,
    SCROLL_DURATION,
    SEARCH_UPDATE_THROTTLE,
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
    setEnforceString
  } from '$lib/logic/documentState.js'
  import { createHistory } from '$lib/logic/history.js'
  import { duplicate, extract, revertJSONPatchWithMoveOperations } from '$lib/logic/operations.js'
  import {
    createSearchAndReplaceAllOperations,
    createSearchAndReplaceOperations,
    search,
    searchNext,
    searchPrevious,
    updateSearchResult
  } from '$lib/logic/search.js'
  import {
    canConvert,
    createAfterSelection,
    createInsideSelection,
    createKeySelection,
    createMultiSelection,
    createSelectionFromOperations,
    createValueSelection,
    findRootPath,
    getInitialSelection,
    getSelectionDown,
    getSelectionLeft,
    getSelectionNextInside,
    getSelectionPaths,
    getSelectionRight,
    getSelectionUp,
    hasSelectionContents,
    isEditingSelection,
    isMultiSelection,
    isSelectionInsidePath,
    isValueSelection,
    removeEditModeFromSelection,
    selectAll,
    updateSelectionInDocumentState
  } from '$lib/logic/selection.js'
  import { mapValidationErrors, validateJSON } from '$lib/logic/validation.js'
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
    normalizeJsonParseError,
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
  import TreeContextMenu from './contextmenu/TreeContextMenu.svelte'
  import JSONNode from './JSONNode.svelte'
  import TreeMenu from './menu/TreeMenu.svelte'
  import Welcome from './Welcome.svelte'
  import NavigationBar from '../../controls/navigationBar/NavigationBar.svelte'
  import SearchBox from './menu/SearchBox.svelte'
  import type {
    AbsolutePopupOptions,
    AfterPatchCallback,
    Content,
    ContentErrors,
    DocumentState,
    HistoryItem,
    InsertType,
    JSONParser,
    JSONPatchResult,
    JSONPathParser,
    JSONPointerMap,
    JSONSelection,
    NestedValidationError,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnClassName,
    OnError,
    OnExpand,
    OnFocus,
    OnJSONEditorModal,
    OnRenderMenuWithoutContext,
    OnRenderValue,
    OnSortModal,
    OnTransformModal,
    ParseError,
    PastedJson,
    SearchResult,
    Section,
    TransformModalOptions,
    TreeModeContext,
    ValidationError,
    Validator,
    ValueNormalization
  } from '$lib/types'
  import { Mode, ValidationSeverity } from '$lib/types.js'
  import { isAfterSelection, isInsideSelection, isKeySelection } from '$lib/logic/selection.js'
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

  const debug = createDebug('jsoneditor:TreeMode')

  const isSSR = typeof window === 'undefined'
  debug('isSSR:', isSSR)

  const { open } = getContext('simple-modal')
  const sortModalId = uniqueId()
  const transformModalId = uniqueId()

  const { openAbsolutePopup, closeAbsolutePopup } = getContext('absolute-popup')

  let refContents
  let refHiddenInput
  let refJsonEditor
  let hasFocus = false
  const jump = createJump()

  export let readOnly: boolean
  export let externalContent: Content
  export let mainMenuBar: boolean
  export let navigationBar: boolean
  export let escapeControlCharacters: boolean
  export let escapeUnicodeCharacters: boolean
  export let startExpanded: boolean
  export let parser: JSONParser
  export let parseMemoizeOne: JSONParser['parse']
  export let validator: Validator | null
  export let validationParser: JSONParser
  export let pathParser: JSONPathParser
  export let indentation: number | string
  export let onError: OnError
  export let onChange: OnChange
  export let onChangeMode: OnChangeMode
  export let onRenderValue: OnRenderValue
  export let onRenderMenu: OnRenderMenuWithoutContext
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

  let json: JSONValue | undefined
  let text: string | undefined
  let parseError: ParseError | undefined = undefined

  function updateSelection(
    selection:
      | JSONSelection
      | undefined
      | ((selection: JSONSelection | undefined) => JSONSelection | undefined)
  ) {
    debug('updateSelection', selection)

    const updatedSelection =
      typeof selection === 'function' ? selection(documentState.selection) : selection

    if (!isEqual(updatedSelection, documentState.selection)) {
      documentState = {
        ...documentState,
        selection: updatedSelection
      }
    }
  }

  let documentStateInitialized = false
  let documentState = createDocumentState()
  let searchResult: SearchResult | undefined

  let normalization: ValueNormalization
  $: normalization = createNormalizationFunctions({
    escapeControlCharacters,
    escapeUnicodeCharacters
  })

  let pastedJson: PastedJson

  let showSearch = false
  let showReplace = false
  let searching = false
  let searchText = ''

  async function handleSearchText(text) {
    debug('search text updated', text)
    searchText = text
    await tick() // await for the search results to be updated
    await focusActiveSearchResult()
  }

  async function handleNextSearchResult() {
    searchResult = searchResult ? searchNext(searchResult) : undefined

    await focusActiveSearchResult()
  }

  async function handlePreviousSearchResult() {
    searchResult = searchResult ? searchPrevious(searchResult) : undefined

    await focusActiveSearchResult()
  }

  async function handleReplace(text, replacementText) {
    const activeItem = searchResult?.activeItem
    debug('handleReplace', { replacementText, activeItem })

    if (!activeItem) {
      return
    }

    const { operations, newSelection } = createSearchAndReplaceOperations(
      json,
      documentState,
      replacementText,
      activeItem,
      parser
    )

    handlePatch(operations, (patchedJson, patchedState) => ({
      state: { ...patchedState, selection: newSelection }
    }))

    await tick()

    await focusActiveSearchResult()
  }

  async function handleReplaceAll(text, replacementText) {
    debug('handleReplaceAll', { text, replacementText })

    const { operations, newSelection } = createSearchAndReplaceAllOperations(
      json,
      documentState,
      text,
      replacementText,
      parser
    )

    handlePatch(operations, (patchedJson, patchedState) => ({
      state: { ...patchedState, selection: newSelection }
    }))

    await tick()

    await focusActiveSearchResult()
  }

  function clearSearchResult() {
    showSearch = false
    showReplace = false
    handleSearchText('')
    focus()
  }

  async function focusActiveSearchResult() {
    const activeItem = searchResult?.activeItem

    debug('focusActiveSearchResult', searchResult)

    if (activeItem) {
      const path = activeItem.path
      documentState = {
        ...expandPath(json, documentState, path),
        selection: undefined // navigation path of current selection would be confusing
      }
      await tick()
      await scrollTo(path)
    }
  }

  // we pass searchText and json as argument to trigger search when these variables change,
  // via $: applySearchThrottled(searchText, json)
  function applySearch(searchText: string, json: JSONValue) {
    if (searchText === '') {
      debug('clearing search result')

      if (searchResult !== undefined) {
        searchResult = undefined
      }

      return
    }

    searching = true

    // setTimeout is to wait until the search icon has been rendered
    setTimeout(() => {
      debug('searching...', searchText)

      // console.time('search') // TODO: cleanup
      const newResultItems = search(searchText, json, MAX_SEARCH_RESULTS)
      searchResult = updateSearchResult(json, newResultItems, searchResult)
      // console.timeEnd('search') // TODO: cleanup

      searching = false
    })
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

    // clear the expanded state and visible sections (else you can't collapse anything)
    const cleanDocumentState = {
      ...documentState,
      expandedMap: {},
      visibleSectionsMap: {}
    }

    documentState = expandWithCallback(json, cleanDocumentState, [], callback)
  }

  // two-way binding of externalContent and internal json and text (
  // when receiving an updated prop, we have to update state for example
  $: applyExternalContent(externalContent)

  const applySearchThrottled = throttle(applySearch, SEARCH_UPDATE_THROTTLE)
  $: applySearchThrottled(searchText, json)

  let textIsRepaired = false
  $: textIsUnrepairable = text !== undefined && json === undefined

  let validationErrors: ValidationError[] = []
  $: updateValidationErrors(json, validator, parser, validationParser)

  let validationErrorsMap: JSONPointerMap<NestedValidationError>
  $: validationErrorsMap = mapValidationErrors(validationErrors)

  // because onChange returns the validation errors and there is also a separate listener,
  // we would execute validation twice. Memoizing the last result solves this.
  const memoizedValidate = memoizeOne(validateJSON)

  function updateValidationErrors(
    json: JSONValue,
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
              message: 'Failed to validate: ' + err.message,
              severity: ValidationSeverity.warning
            }
          ]
        }

        if (!isEqual(newValidationErrors, validationErrors)) {
          debug('validationErrors changed:', newValidationErrors)
          validationErrors = newValidationErrors
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

  function getDocumentState(): DocumentState {
    return documentState
  }

  function applyExternalContent(updatedContent) {
    if (updatedContent.json !== undefined) {
      applyExternalJson(updatedContent.json)
    }

    if (updatedContent.text !== undefined) {
      applyExternalText(updatedContent.text)
    }
  }

  function applyExternalJson(updatedJson) {
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

    const previousContent = { json, text }
    const previousState = documentState
    const previousJson = json
    const previousText = text
    const previousTextIsRepaired = textIsRepaired

    json = updatedJson
    expandWhenNotInitialized(json)
    text = undefined
    textIsRepaired = false
    parseError = undefined
    clearSelectionWhenNotExisting(json)

    addHistoryItem({
      previousJson,
      previousState,
      previousText,
      previousTextIsRepaired
    })

    // we could work out a patchResult, or use patch(), but only when the previous and new
    // contents are both json and not text. We go for simplicity and consistency here and
    // let the functions applyExternalJson and applyExternalText _not_ return
    // a patchResult ever.
    const patchResult = null

    emitOnChange(previousContent, patchResult)
  }

  function applyExternalText(updatedText) {
    if (updatedText === undefined || externalContent['json'] !== undefined) {
      return
    }

    const isChanged = updatedText !== text

    debug('update external text', { isChanged })

    if (!isChanged) {
      // no actual change, don't do anything
      return
    }

    const previousContent = { json, text }
    const previousJson = json
    const previousState = documentState
    const previousText = text
    const previousTextIsRepaired = textIsRepaired

    try {
      json = parseMemoizeOne(updatedText)
      expandWhenNotInitialized(json)
      text = updatedText
      textIsRepaired = false
      parseError = undefined
    } catch (err) {
      try {
        json = parseMemoizeOne(jsonrepair(updatedText))
        expandWhenNotInitialized(json)
        text = updatedText
        textIsRepaired = true
        parseError = undefined
        clearSelectionWhenNotExisting(json)
      } catch (repairError) {
        // no valid JSON, will show empty document or invalid json
        json = undefined
        text = externalContent['text']
        textIsRepaired = false
        parseError =
          text !== undefined && text !== ''
            ? normalizeJsonParseError(text, err.message || err.toString())
            : undefined
      }
    }

    clearSelectionWhenNotExisting(json)

    addHistoryItem({
      previousJson,
      previousState,
      previousText,
      previousTextIsRepaired
    })

    // we could work out a patchResult, or use patch(), but only when the previous and new
    // contents are both json and not text. We go for simplicity and consistency here and
    // let the functions applyExternalJson and applyExternalText _not_ return
    // a patchResult ever.
    const patchResult = null

    emitOnChange(previousContent, patchResult)
  }

  function expandWhenNotInitialized(json) {
    if (!documentStateInitialized) {
      documentStateInitialized = true
      const shouldExpand = startExpanded ? expandAll : getDefaultExpand(json)
      documentState = expandWithCallback(json, documentState, [], shouldExpand)
    }
  }

  function clearSelectionWhenNotExisting(json) {
    if (documentState.selection === undefined) {
      return
    }

    if (
      documentState.selection &&
      existsIn(json, documentState.selection.anchorPath) &&
      existsIn(json, documentState.selection.focusPath)
    ) {
      return
    }

    debug('clearing selection: path does not exist anymore', documentState.selection)
    documentState = {
      ...documentState,
      selection: getInitialSelection(json, documentState)
    }
  }

  function addHistoryItem({
    previousJson,
    previousState,
    previousText,
    previousTextIsRepaired
  }: {
    previousJson: JSONValue | undefined
    previousText: string | undefined
    previousState: DocumentState
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
            state: removeEditModeFromSelection(previousState),
            json: undefined,
            text: previousText,
            textIsRepaired: previousTextIsRepaired
          },
          redo: {
            patch: [{ op: 'replace', path: '', value: json }],
            state: removeEditModeFromSelection(documentState),
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
            state: removeEditModeFromSelection(previousState),
            textIsRepaired: previousTextIsRepaired
          },
          redo: {
            patch: undefined,
            json,
            state: removeEditModeFromSelection(documentState),
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
            state: removeEditModeFromSelection(previousState),
            text: previousText,
            textIsRepaired: previousTextIsRepaired
          },
          redo: {
            patch: undefined,
            json: undefined,
            text,
            textIsRepaired,
            state: removeEditModeFromSelection(documentState)
          }
        })
      } else {
        // this cannot happen. Nothing to do, no change
      }
    }
  }

  function createDefaultSelection() {
    debug('createDefaultSelection')

    documentState = {
      ...documentState,
      selection: createMultiSelection(json || {}, [], [])
    }
  }

  export function patch(
    operations: JSONPatchDocument,
    afterPatch?: AfterPatchCallback
  ): JSONPatchResult {
    debug('patch', operations, afterPatch)

    if (json === undefined) {
      throw new Error('Cannot apply patch: no JSON')
    }

    const previousContent = { json, text }
    const previousJson = json
    const previousState = documentState
    const previousText = text
    const previousTextIsRepaired = textIsRepaired

    // execute the patch operations
    const undo: JSONPatchDocument = revertJSONPatchWithMoveOperations(
      json,
      operations
    ) as JSONPatchDocument
    const patched = documentStatePatch(json, documentState, operations)

    // update the selection based on the operations
    const updatedSelection = createSelectionFromOperations(json, operations)
    const patchedDocumentState = updateSelectionInDocumentState(
      patched.documentState,
      updatedSelection,
      false
    )
    debug('patch updatedSelection', updatedSelection)

    const callback =
      typeof afterPatch === 'function' ? afterPatch(patched.json, patchedDocumentState) : undefined

    json = callback && callback.json !== undefined ? callback.json : patched.json
    const newState =
      callback && callback.state !== undefined ? callback.state : patchedDocumentState
    documentState = newState
    text = undefined
    textIsRepaired = false
    pastedJson = undefined
    parseError = undefined

    // ensure the selection is valid
    clearSelectionWhenNotExisting(json)

    history.add({
      undo: {
        patch: undo,
        json: undefined,
        text: previousText,
        state: removeEditModeFromSelection(previousState),
        textIsRepaired: previousTextIsRepaired
      },
      redo: {
        patch: operations,
        json: undefined,
        state: removeEditModeFromSelection(newState),
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

    emitOnChange(previousContent, patchResult)

    return patchResult
  }

  // TODO: cleanup logging
  // $: debug('json', json)
  // $: debug('state', state)
  // $: debug('selection', selection)

  function handleEditKey() {
    if (readOnly || !documentState.selection) {
      return
    }

    updateSelection(createKeySelection(documentState.selection.focusPath, true))
  }

  function handleEditValue() {
    if (readOnly || !documentState.selection) {
      return
    }

    const path = documentState.selection.focusPath
    const value = getIn(json, path)
    if (isObjectOrArray(value)) {
      openJSONEditorModal(path, value)
    } else {
      updateSelection(createValueSelection(path, true))
    }
  }

  function handleToggleEnforceString() {
    if (readOnly || !isValueSelection(documentState.selection)) {
      return
    }

    const path = documentState.selection.focusPath
    const pointer = compileJSONPointer(path)
    const value = getIn(json, path)
    const enforceString = !getEnforceString(value, documentState.enforceStringMap, pointer, parser)
    const updatedValue = enforceString ? String(value) : stringConvert(String(value), parser)

    debug('handleToggleEnforceString', { enforceString, value, updatedValue })

    handlePatch(
      [
        {
          op: 'replace',
          path: pointer,
          value: updatedValue as JSONValue
        }
      ],
      (patchedJson, patchedState) => {
        return {
          state: setEnforceString(patchedState, pointer, enforceString)
        }
      }
    )
  }

  export function acceptAutoRepair() {
    if (textIsRepaired && json !== undefined) {
      handleReplaceJson(json)
    }

    return { json, text }
  }

  async function handleCut(indent = true) {
    await onCut({
      json,
      documentState,
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
      documentState,
      indentation: indent ? indentation : undefined,
      parser
    })
  }

  function handlePaste(event: ClipboardEvent) {
    event.preventDefault()

    const clipboardText = event.clipboardData.getData('text/plain')

    onPaste({
      clipboardText,
      json,
      documentState,
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
        onParse: parsePartialJson,
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
      documentState,
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
      !documentState.selection ||
      !hasSelectionContents(documentState.selection) ||
      isEmpty(documentState.selection.focusPath) // root selected, cannot duplicate
    ) {
      return
    }

    debug('duplicate', { selection: documentState.selection })

    const operations = duplicate(json, getSelectionPaths(documentState.selection))

    handlePatch(operations)
  }

  function handleExtract() {
    if (
      readOnly ||
      !documentState.selection ||
      (!isMultiSelection(documentState.selection) && !isValueSelection(documentState.selection)) ||
      isEmpty(documentState.selection.focusPath) // root selected, cannot extract
    ) {
      return
    }

    debug('extract', { selection: documentState.selection })

    const operations = extract(json, documentState.selection)

    handlePatch(operations, (patchedJson, patchedState) => {
      if (isObjectOrArray(patchedJson)) {
        // expand extracted object/array
        const path = []
        return {
          state: expandRecursive(patchedJson, patchedState, path)
        }
      }
    })
  }

  function handleInsert(insertType: InsertType): void {
    if (json === undefined) {
      return
    }

    onInsert({
      insertType,
      selectInside: true,
      refJsonEditor,
      json,
      documentState,
      readOnly,
      parser,
      onPatch: handlePatch,
      onReplaceJson: handleReplaceJson
    })
  }

  /**
   * @param {'value' | 'object' | 'array' | 'structure'} type
   */
  function handleInsertFromContextMenu(type) {
    if (isKeySelection(documentState.selection)) {
      // in this case, we do not want to rename the key, but replace the property
      updateSelection(createValueSelection(documentState.selection.focusPath, false))
    }

    handleInsert(type)
  }

  /**
   * @param {'value' | 'object' | 'array'} type
   */
  function handleConvert(type) {
    if (readOnly || !documentState.selection) {
      return
    }

    if (!canConvert(documentState.selection)) {
      onError(new Error(`Cannot convert current selection to ${type}`))
      return
    }

    try {
      const path = documentState.selection.anchorPath
      const currentValue: JSONValue = getIn(json, path)
      const convertedValue = convertValue(currentValue, type, parser)
      if (convertedValue === currentValue) {
        // no change, do nothing
        return
      }

      const operations: JSONPatchDocument = [
        { op: 'replace', path: compileJSONPointer(path), value: convertedValue }
      ]

      debug('handleConvert', { selection: documentState.selection, path, type, operations })

      handlePatch(operations, (patchedJson, patchedState) => {
        // expand converted object/array
        return {
          state: expandRecursive(patchedJson, patchedState, documentState.selection.focusPath)
        }
      })
    } catch (err) {
      onError(err)
    }
  }

  function handleInsertBefore() {
    const selectionBefore = getSelectionUp(json, documentState, false)
    const parentPath = initial(documentState.selection.focusPath)

    if (
      !isEmpty(selectionBefore.focusPath) &&
      isEqual(parentPath, initial(selectionBefore.focusPath))
    ) {
      updateSelection(createAfterSelection(selectionBefore.focusPath))
    } else {
      updateSelection(createInsideSelection(parentPath))
    }

    debug('insert before', { selection: documentState.selection, selectionBefore, parentPath })

    tick().then(handleContextMenu)
  }

  function handleInsertAfter() {
    const path = isMultiSelection(documentState.selection)
      ? last(documentState.selection.paths)
      : documentState.selection.focusPath

    debug('insert after', path)

    updateSelection(createAfterSelection(path))

    tick().then(handleContextMenu)
  }

  async function handleInsertCharacter(char: string) {
    await onInsertCharacter({
      char,
      selectInside: true,
      refJsonEditor,
      json,
      documentState,
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
    text = item.undo.text
    textIsRepaired = item.undo.textIsRepaired
    parseError = undefined

    debug('undo', { item, json, documentState })

    const patchResult = {
      json,
      previousJson: previousContent.json,
      redo: item.undo.patch,
      undo: item.redo.patch
    }

    emitOnChange(previousContent, patchResult)

    focus()
    if (documentState.selection) {
      scrollTo(documentState.selection.focusPath, false)
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
    text = item.redo.text
    textIsRepaired = item.redo.textIsRepaired
    parseError = undefined

    debug('redo', { item, json, documentState })

    const patchResult = {
      json,
      previousJson: previousContent.json,
      redo: item.redo.patch,
      undo: item.undo.patch
    }

    emitOnChange(previousContent, patchResult)

    focus()
    if (documentState.selection) {
      scrollTo(documentState.selection.focusPath, false)
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
          state: {
            ...expandRecursive(patchedJson, patchedState, rootPath),
            selection: createValueSelection(rootPath, false)
          }
        }))
      },
      onClose: () => {
        modalOpen = false
        focus()
      }
    })
  }

  function handleSortSelection() {
    if (!documentState.selection) {
      return
    }

    const rootPath = findRootPath(json, documentState.selection)
    openSortModal(rootPath)
  }

  function handleSortAll() {
    const rootPath = []
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
            json: json as JSONValue,
            transformedJson: immutableJSONPatch(json as JSONValue, operations)
          })
        } else {
          debug('onTransform', rootPath, operations)

          handlePatch(operations, (patchedJson, patchedState) => ({
            // expand the newly replaced array and select it
            state: {
              ...expandRecursive(patchedJson, patchedState, rootPath),
              selection: createValueSelection(rootPath, false)
            }
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
    if (!documentState.selection) {
      return
    }

    const rootPath = findRootPath(json, documentState.selection)
    openTransformModal({
      rootPath
    })
  }

  function handleTransformAll() {
    openTransformModal({
      rootPath: []
    })
  }

  function openJSONEditorModal(path: JSONPath, value: JSONValue) {
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
    documentState = expandPath(json, documentState, initial(path))
    await tick() // await rerender

    const elem = findElement(path)
    if (elem) {
      debug('scrollTo', { path, elem, refContents })

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
    } else {
      return Promise.resolve()
    }
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
      onChange(content, previousContent, {
        contentErrors: validate(),
        patchResult
      })
    } else if (json !== undefined) {
      const content = { text: undefined, json }
      onChange(content, previousContent, {
        contentErrors: validate(),
        patchResult
      })
    }
  }

  function handlePatch(
    operations: JSONPatchDocument,
    afterPatch?: AfterPatchCallback
  ): JSONPatchResult {
    if (readOnly) {
      return
    }

    debug('handlePatch', operations, afterPatch)

    return patch(operations, afterPatch)
  }

  function handleReplaceJson(updatedJson: JSONValue, afterPatch?: AfterPatchCallback) {
    const previousState = documentState
    const previousJson = json
    const previousText = text
    const previousContent = { json, text }
    const previousTextIsRepaired = textIsRepaired

    const updatedState = expandWithCallback(json, documentState, [], expandMinimal)

    const callback =
      typeof afterPatch === 'function' ? afterPatch(updatedJson, updatedState) : undefined

    json = callback && callback.json !== undefined ? callback.json : updatedJson
    documentState = callback && callback.state !== undefined ? callback.state : updatedState
    text = undefined
    textIsRepaired = false
    parseError = undefined

    // make sure the selection is valid
    clearSelectionWhenNotExisting(json)

    addHistoryItem({
      previousJson,
      previousState,
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
    const previousJson = json
    const previousText = text
    const previousContent = { json, text }
    const previousTextIsRepaired = textIsRepaired

    try {
      json = parseMemoizeOne(updatedText)
      documentState = expandWithCallback(json, documentState, [], expandMinimal)
      text = undefined
      textIsRepaired = false
      parseError = undefined
    } catch (err) {
      try {
        json = parseMemoizeOne(jsonrepair(updatedText))
        documentState = expandWithCallback(json, documentState, [], expandMinimal)
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
          text !== '' ? normalizeJsonParseError(text, err.message || err.toString()) : undefined
      }
    }

    if (typeof afterPatch === 'function') {
      const callback = afterPatch(json, documentState)

      json = callback && callback.json ? callback.json : json
      documentState = callback && callback.state ? callback.state : documentState
    }

    // ensure the selection is valid
    clearSelectionWhenNotExisting(json)

    addHistoryItem({
      previousJson,
      previousState,
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
    debug('expand', { path, expanded, recursive })

    if (expanded) {
      if (recursive) {
        documentState = expandWithCallback(json, documentState, path, expandAll)
      } else {
        documentState = expandSingleItem(documentState, path)
      }
    } else {
      documentState = collapsePath(documentState, path)
    }

    if (documentState.selection && !expanded) {
      // check whether the selection is still visible and not collapsed
      if (isSelectionInsidePath(documentState.selection, path)) {
        // remove selection when not visible anymore
        updateSelection(undefined)
      }
    }

    // set focus to the hidden input, so we can capture quick keys like Ctrl+X, Ctrl+C, Ctrl+V
    setTimeout(() => {
      if (!activeElementIsChildOf(refJsonEditor)) {
        focus()
      }
    })
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

    const pointer = compileJSONPointer(path)
    documentState = expandSection(json, documentState, pointer, section)
  }

  function handlePasteJson(newPastedJson: PastedJson) {
    debug('pasted json as text', newPastedJson)

    pastedJson = newPastedJson
  }

  function handleKeyDown(event) {
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

      const newSelection = documentState.selection
        ? getSelectionUp(json, documentState, keepAnchorPath, true) || documentState.selection
        : getInitialSelection(json, documentState)

      updateSelection(newSelection)
      scrollIntoView(newSelection.focusPath)
    }
    if (combo === 'ArrowDown' || combo === 'Shift+ArrowDown') {
      event.preventDefault()

      const newSelection = documentState.selection
        ? getSelectionDown(json, documentState, keepAnchorPath, true) || documentState.selection
        : getInitialSelection(json, documentState)

      updateSelection(newSelection)
      scrollIntoView(newSelection.focusPath)
    }
    if (combo === 'ArrowLeft' || combo === 'Shift+ArrowLeft') {
      event.preventDefault()

      const newSelection = documentState.selection
        ? getSelectionLeft(json, documentState, keepAnchorPath, !readOnly) ||
          documentState.selection
        : getInitialSelection(json, documentState)

      updateSelection(newSelection)
      scrollIntoView(newSelection.focusPath)
    }
    if (combo === 'ArrowRight' || combo === 'Shift+ArrowRight') {
      event.preventDefault()

      const newSelection =
        documentState.selection && json !== undefined
          ? getSelectionRight(json, documentState, keepAnchorPath, !readOnly) ||
            documentState.selection
          : getInitialSelection(json, documentState)

      updateSelection(newSelection)
      scrollIntoView(newSelection.focusPath)
    }

    if (combo === 'Enter' && documentState.selection) {
      // when the selection consists of a single Array item, change selection to editing its value
      if (
        !readOnly &&
        isMultiSelection(documentState.selection) &&
        documentState.selection.paths.length === 1
      ) {
        const path = documentState.selection.focusPath
        const parent = getIn(json, initial(path))
        if (Array.isArray(parent)) {
          // change into selection of the value
          updateSelection(createValueSelection(path, false))
        }
      }

      if (!readOnly && isKeySelection(documentState.selection)) {
        // go to key edit mode
        event.preventDefault()
        updateSelection({ ...documentState.selection, edit: true })
      }

      if (isValueSelection(documentState.selection)) {
        event.preventDefault()

        const value = getIn(json, documentState.selection.focusPath)
        if (isObjectOrArray(value)) {
          // expand object/array
          handleExpand(documentState.selection.focusPath, true)
        } else {
          if (!readOnly) {
            // go to value edit mode
            updateSelection({ ...documentState.selection, edit: true })
          }
        }
      }
    }

    const normalizedCombo = combo.replace(/^Shift\+/, '') // replace 'Shift+A' with 'A'
    if (normalizedCombo.length === 1 && documentState.selection) {
      // a regular key like a, A, _, etc is entered.
      // Replace selected contents with a new value having this first character as text
      event.preventDefault()
      handleInsertCharacter(event.key)
      return
    }

    if (
      combo === 'Enter' &&
      (isAfterSelection(documentState.selection) || isInsideSelection(documentState.selection))
    ) {
      // Enter on an insert area -> open the area in edit mode
      event.preventDefault()
      handleInsertCharacter('')
      return
    }

    if (combo === 'Ctrl+Enter' && isValueSelection(documentState.selection)) {
      const value = getIn(json, documentState.selection.focusPath)

      if (isUrl(value)) {
        // open url in new page
        window.open(String(value), '_blank')
      }
    }

    if (combo === 'Escape' && documentState.selection) {
      event.preventDefault()
      updateSelection(undefined)
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

      // TODO: find a better way to restore focus
      // TODO: implement a proper TypeScript solution to check whether this is an element with blur, focus, select
      const activeElement = document.activeElement as HTMLInputElement
      if (activeElement && activeElement.blur && activeElement.focus) {
        activeElement.blur()
        setTimeout(() => {
          handleUndo()
          setTimeout(() => activeElement.select())
        })
      } else {
        handleUndo()
      }
    }

    if (combo === 'Ctrl+Shift+Z') {
      event.preventDefault()

      // TODO: find a better way to restore focus
      // TODO: implement a proper TypeScript solution to check whether this is an element with blur, focus, select
      const activeElement = document.activeElement as HTMLInputElement
      if (activeElement && activeElement.blur && activeElement.focus) {
        activeElement.blur()
        setTimeout(() => {
          handleRedo()
          setTimeout(() => activeElement.select())
        })
      } else {
        handleRedo()
      }
    }
  }

  function handleMouseDown(event) {
    debug('handleMouseDown', event)

    // TODO: ugly to have two setTimeout here. Without it, hiddenInput will blur
    setTimeout(() => {
      setTimeout(() => {
        if (!hasFocus && !isChildOfNodeName(event.target, 'BUTTON')) {
          // for example when clicking on the empty area in the main menu
          focus()

          if (
            !documentState.selection &&
            json === undefined &&
            (text === '' || text === undefined)
          ) {
            createDefaultSelection()
          }
        }
      })
    })
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
    const props = {
      json,
      documentState: documentState,
      parser,
      showTip,

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
      onConvert: handleConvert,
      onInsertAfter: handleInsertAfter,

      onSort: handleSortSelection,
      onTransform: handleTransformSelection,

      onCloseContextMenu: function () {
        closeAbsolutePopup(popupId)
        focus()
      }
    }

    modalOpen = true

    const popupId = openAbsolutePopup(TreeContextMenu, props, {
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
    })
  }

  function handleContextMenu(event) {
    if (readOnly || isEditingSelection(documentState.selection)) {
      return
    }

    if (event) {
      event.stopPropagation()
      event.preventDefault()
    }

    if (event && event.type === 'contextmenu' && event.target !== refHiddenInput) {
      // right mouse click to open context menu
      openContextMenu({
        left: event.clientX,
        top: event.clientY,
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

  function handleContextMenuFromTreeMenu(event) {
    if (readOnly) {
      return
    }

    openContextMenu({
      anchor: findParentWithNodeName(event.target, 'BUTTON'),
      offsetTop: 0,
      width: CONTEXT_MENU_WIDTH,
      height: CONTEXT_MENU_HEIGHT,
      showTip: true
    })
  }

  async function handleParsePastedJson() {
    debug('apply pasted json', pastedJson)
    const { path, contents } = pastedJson

    // exit edit mode
    updateSelection(createValueSelection(path, false))

    await tick()

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
  }

  function handleClearPastedJson() {
    debug('clear pasted json')
    pastedJson = undefined
  }

  function handleRequestRepair() {
    onChangeMode(Mode.text)
  }

  function handleNavigationBarSelect(newSelection: JSONSelection) {
    updateSelection(newSelection)

    focus()
    scrollTo(newSelection.focusPath)
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

  function handleWindowMouseDown(event) {
    const outsideEditor = !isChildOf(event.target, (element) => element === refJsonEditor)
    if (outsideEditor) {
      if (isEditingSelection(documentState.selection)) {
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

        // This is ugly: we need to wait until the EditableDiv has triggered onSelect,
        //  and have onSelect call refHiddenInput.focus(). After that we can call blur()
        //  to remove the focus.
        // TODO: find a better solution
        tick().then(() => {
          setTimeout(() => {
            if (refHiddenInput) {
              refHiddenInput.blur()
            }
          })
        })
      }
    }
  }

  function findNextInside(path: JSONPath): JSONSelection {
    return getSelectionNextInside(json, documentState, path)
  }

  $: autoScrollHandler = refContents ? createAutoScrollHandler(refContents) : undefined

  function handleDrag(event) {
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
      selection={documentState.selection}
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
    <NavigationBar
      {json}
      {documentState}
      onSelect={handleNavigationBarSelect}
      {onError}
      {pathParser}
    />
  {/if}

  {#if !isSSR}
    <label class="jse-hidden-input-label">
      <input
        type="text"
        readonly="readonly"
        tabindex="-1"
        class="jse-hidden-input"
        bind:this={refHiddenInput}
        on:paste={handlePaste}
      />
    </label>
    {#if json === undefined}
      {#if text === '' || text === undefined}
        <Welcome {readOnly} />
      {:else}
        <Message
          type="error"
          message="The loaded JSON document is invalid and could not be repaired automatically."
          actions={!readOnly
            ? [
                {
                  icon: faCode,
                  text: 'Repair manually',
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
          show={showSearch}
          resultCount={searchResult?.items?.length || 0}
          activeIndex={searchResult?.activeIndex || 0}
          {showReplace}
          {searching}
          {readOnly}
          onChange={handleSearchText}
          onNext={handleNextSearchResult}
          onPrevious={handlePreviousSearchResult}
          onReplace={handleReplace}
          onReplaceAll={handleReplaceAll}
          onClose={clearSearchResult}
        />
      </div>
      <div class="jse-contents" data-jsoneditor-scrollable-contents={true} bind:this={refContents}>
        <JSONNode
          value={json}
          path={[]}
          expandedMap={documentState.expandedMap}
          enforceStringMap={documentState.enforceStringMap}
          visibleSectionsMap={documentState.visibleSectionsMap}
          {validationErrorsMap}
          searchResultItemsMap={searchResult?.itemsMap}
          selection={documentState.selection}
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
              // We use mousedown here instead of click: this message pops up
              // whilst the user is editing a value. When clicking this button,
              // the actual value is applied and the event is not propagated
              // and an onClick on this button never happens.
              onMouseDown: handleParsePastedJson
            },
            {
              text: 'Leave as is',
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
                  onClick: acceptAutoRepair
                },
                {
                  icon: faCode,
                  text: 'Repair manually instead',
                  onClick: handleRequestRepair
                }
              ]
            : []}
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
