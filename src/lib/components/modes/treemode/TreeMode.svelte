<svelte:options immutable={true} />

<script lang="ts">
  import { createAutoScrollHandler } from '../../controls/createAutoScrollHandler'
  import { faCheck, faCode, faWrench } from '@fortawesome/free-solid-svg-icons'
  import { createDebug } from '$lib/utils/debug'
  import type { JSONPath } from 'immutable-json-patch'
  import {
    compileJSONPointer,
    existsIn,
    getIn,
    immutableJSONPatch,
    revertJSONPatch
  } from 'immutable-json-patch'
  import jsonrepair from 'jsonrepair'
  import { initial, isEmpty, isEqual, last, noop, throttle, uniqueId } from 'lodash-es'
  import { getContext, onDestroy, onMount, tick } from 'svelte'
  import { createJump } from '$lib/assets/jump.js/src/jump'
  import {
    CONTEXT_MENU_HEIGHT,
    CONTEXT_MENU_WIDTH,
    MAX_DOCUMENT_SIZE_EXPAND_ALL,
    MAX_SEARCH_RESULTS,
    SCROLL_DURATION,
    SEARCH_UPDATE_THROTTLE,
    SIMPLE_MODAL_OPTIONS
  } from '$lib/constants'
  import {
    collapsePath,
    createDocumentState,
    documentStatePatch,
    expandPath,
    expandSection,
    expandSingleItem,
    expandWithCallback,
    getEnforceString,
    setEnforceString
  } from '$lib/logic/documentState'
  import { createHistory } from '$lib/logic/history'
  import {
    createNewValue,
    createRemoveOperations,
    duplicate,
    extract,
    insert
  } from '$lib/logic/operations'
  import {
    createSearchAndReplaceAllOperations,
    createSearchAndReplaceOperations,
    search,
    searchNext,
    searchPrevious,
    updateSearchResult
  } from '$lib/logic/search'
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
    isEditingSelection,
    isMultiSelection,
    isSelectionInsidePath,
    isValueSelection,
    removeEditModeFromSelection,
    selectAll,
    selectionToPartialJson,
    updateSelectionInDocumentState
  } from '$lib/logic/selection'
  import { mapValidationErrors } from '$lib/logic/validation'
  import {
    activeElementIsChildOf,
    createNormalizationFunctions,
    encodeDataPath,
    findParentWithNodeName,
    getWindow,
    isChildOf,
    isChildOfNodeName,
    setCursorToEnd
  } from '$lib/utils/domUtils'
  import { parseJSONPointerWithArrayIndices } from '$lib/utils/jsonPointer'
  import {
    convertValue,
    isLargeContent,
    parsePartialJson,
    repairPartialJson
  } from '$lib/utils/jsonUtils'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'
  import { isObject, isObjectOrArray, isUrl, stringConvert } from '$lib/utils/typeUtils'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'
  import Message from '../../controls/Message.svelte'
  import ValidationErrorsOverview from '../../controls/ValidationErrorsOverview.svelte'
  import CopyPasteModal from '../../modals/CopyPasteModal.svelte'
  import JSONRepairModal from '../../modals/JSONRepairModal.svelte'
  import ContextMenu from './contextmenu/ContextMenu.svelte'
  import JSONNode from './JSONNode.svelte'
  import TreeMenu from './menu/TreeMenu.svelte'
  import Welcome from './Welcome.svelte'
  import NavigationBar from '../../controls/navigationBar/NavigationBar.svelte'
  import SearchBox from './menu/SearchBox.svelte'
  import type {
    AbsolutePopupOptions,
    AfterPatchCallback,
    DocumentState,
    HistoryItem,
    InsertType,
    JSONData,
    JSONPatchDocument,
    JSONPatchResult,
    OnChange,
    OnClassName,
    OnRenderValue,
    PastedJson,
    Path,
    SearchResult,
    Section,
    Selection,
    TransformModalOptions,
    TreeModeContext,
    ValidationError,
    Validator,
    ValueNormalization
  } from '$lib/types'
  import { get, writable } from 'svelte/store'
  import { isAfterSelection, isInsideSelection, isKeySelection } from '../../../logic/selection'
  import { isJSONPatchAdd, isJSONPatchReplace } from '../../../typeguards'
  import { JSONPointerMap } from '$lib/types'

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

  export let readOnly = false
  export let externalContent
  export let mainMenuBar = true
  export let navigationBar = true
  export let escapeControlCharacters = false
  export let escapeUnicodeCharacters = false
  export let validator: Validator = null

  export let indentation: number | string = 2
  export let onError
  export let onChange: OnChange
  export let onRenderValue: OnRenderValue
  export let onRequestRepair = noop
  export let onRenderMenu = noop
  export let onClassName: OnClassName
  export let onFocus
  export let onBlur
  export let onSortModal
  export let onTransformModal

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

  let json: JSONData | undefined
  let text: string | undefined
  const rootPath = [] // create the array only once

  function updateSelection(
    selection: Selection | undefined | ((selection: Selection | undefined) => Selection | undefined)
  ) {
    debug('updateSelection', selection)

    documentStateStore.update((state) => {
      const updatedSelection =
        typeof selection === 'function' ? selection(state.selection) : selection

      if (isEqual(updatedSelection, state.selection)) {
        return state
      }

      return {
        ...state,
        selection: updatedSelection
      }
    })
  }

  const documentStateStore = writable<DocumentState>(
    createDocumentState({ json, expand: getDefaultExpand(json) })
  )
  let searchResult: SearchResult | undefined
  let validationErrors: ValidationError[]
  let validationErrorsMap: JSONPointerMap<ValidationError>
  $: validationErrorsMap = mapValidationErrors(validationErrors)

  $: debug('documentState', $documentStateStore)

  let normalization: ValueNormalization
  $: normalization = createNormalizationFunctions({
    escapeControlCharacters,
    escapeUnicodeCharacters
  })

  let pastedJson: PastedJson

  function expandMinimal(path) {
    return path.length < 1 ? true : path.length === 1 && path[0] === 0 // first item of an array
  }

  function expandAll() {
    return true
  }

  function getDefaultExpand(json) {
    return isLargeContent({ json }, MAX_DOCUMENT_SIZE_EXPAND_ALL) ? expandMinimal : expandAll
  }

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
      get(documentStateStore),
      replacementText,
      activeItem
    )

    handlePatch(operations, () => ({ selection: newSelection }))

    await tick()

    await focusActiveSearchResult()
  }

  async function handleReplaceAll(text, replacementText) {
    debug('handleReplaceAll', { text, replacementText })

    const { operations, newSelection } = createSearchAndReplaceAllOperations(
      json,
      get(documentStateStore),
      text,
      replacementText
    )

    handlePatch(operations, () => ({ selection: newSelection }))

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
      documentStateStore.update((state) => expandPath(json, state, path))
      updateSelection(undefined) // navigation path of current selection would be confusing // TODO: clenaup
      await tick()
      await scrollTo(path)
    }
  }

  function applySearch() {
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
      const newResultItems = search(searchText, json, get(documentStateStore), MAX_SEARCH_RESULTS)
      searchResult = updateSearchResult(json, newResultItems, searchResult)
      // console.timeEnd('search') // TODO: cleanup

      searching = false
    })
  }

  const applySearchThrottled = throttle(applySearch, SEARCH_UPDATE_THROTTLE)

  // we pass non-used arguments searchText and json to trigger search when these variables change
  $: applySearchThrottled(searchText, json)

  function handleSelectValidationError(error: ValidationError) {
    debug('select validation error', error)

    updateSelection(createValueSelection(error.path, false))
    scrollTo(error.path)
    focus()
  }

  const history = createHistory<HistoryItem>({
    onChange: (state) => {
      historyState = state
    }
  })
  let historyState = history.getState()

  export function expand(callback = () => true) {
    debug('expand')
    documentStateStore.update((state) => expandWithCallback(json, state, rootPath, callback))
  }

  // two-way binding of externalContent and internal json and text (
  // when receiving an updated prop, we have to update state for example
  $: applyExternalContent(externalContent)

  let textIsRepaired = false
  $: textIsUnrepairable = text !== undefined && json === undefined

  $: updateValidationErrors(json, validator)

  function updateValidationErrors(json: JSONData, validator: Validator | null) {
    const newValidationErrors: ValidationError[] = validator ? validator(json) : []

    if (!isEqual(newValidationErrors, validationErrors)) {
      debug('updateValidationErrors', newValidationErrors)

      validationErrors = newValidationErrors
    }
  }

  export function getJson() {
    return json
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
    const isText = json === undefined

    debug('update external json', { isChanged, isText })

    if (!isChanged) {
      // no actual change, don't do anything
      return
    }

    const previousState = get(documentStateStore)
    const previousJson = json
    const previousText = text
    const previousTextIsRepaired = textIsRepaired
    const previousSelection = previousState.selection

    json = updatedJson
    documentStateStore.update((state) =>
      expandWithCallback(json, state, rootPath, getDefaultExpand(json))
    )
    text = undefined
    textIsRepaired = false
    clearSelectionWhenNotExisting(json)

    addHistoryItem({
      previousJson,
      previousState,
      previousText,
      previousTextIsRepaired,
      previousSelection
    })

    // TODO: triggering applySearchThrottled() here should not be needed
    applySearchThrottled()
  }

  function applyExternalText(updatedText) {
    if (updatedText === undefined || externalContent.json !== undefined) {
      return
    }

    if (updatedText === text) {
      // no actual change, don't do anything
      return
    }

    debug('update external text')

    const previousJson = json
    const previousState = get(documentStateStore)
    const previousText = text
    const previousTextIsRepaired = textIsRepaired
    const previousSelection = previousState.selection

    try {
      json = JSON.parse(updatedText)
      documentStateStore.update((state) =>
        expandWithCallback(json, state, rootPath, getDefaultExpand(json))
      )
      text = updatedText
      textIsRepaired = false
      clearSelectionWhenNotExisting(json)
    } catch (err) {
      try {
        json = JSON.parse(jsonrepair(updatedText))
        documentStateStore.update((state) =>
          expandWithCallback(json, state, rootPath, getDefaultExpand(json))
        )
        text = updatedText
        textIsRepaired = true
        clearSelectionWhenNotExisting(json)
      } catch (err) {
        // no valid JSON, will show empty document or invalid json
        json = undefined
        text = externalContent.text
        textIsRepaired = false
        clearSelectionWhenNotExisting(json)
      }
    }

    if (
      !get(documentStateStore).selection &&
      json === undefined &&
      (text === '' || text === undefined)
    ) {
      // make sure there is a selection,
      // else we cannot paste or insert in case of an empty document
      createDefaultSelection()
    }

    addHistoryItem({
      previousJson,
      previousState,
      previousText,
      previousTextIsRepaired,
      previousSelection
    })

    // TODO: triggering applySearchThrottled() here should not be needed
    applySearchThrottled()
  }

  function clearSelectionWhenNotExisting(json) {
    const selection = $documentStateStore.selection

    if (selection === undefined) {
      return
    }

    if (
      selection &&
      existsIn(json, selection.anchorPath as JSONPath) &&
      existsIn(json, selection.focusPath as JSONPath)
    ) {
      return
    }

    debug('clearing selection: path does not exist anymore', selection)
    $documentStateStore = {
      ...get(documentStateStore),
      selection: undefined
    }
  }

  function addHistoryItem({
    previousJson,
    previousState,
    previousText,
    previousTextIsRepaired,
    previousSelection
  }: {
    previousJson: JSONData | undefined
    previousText: string | undefined
    previousState: DocumentState
    previousTextIsRepaired: boolean
    previousSelection: Selection | undefined
  }) {
    const state = get(documentStateStore)

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
            state: removeEditModeFromSelection(state),
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
            state: removeEditModeFromSelection(state),
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
            state: removeEditModeFromSelection(state)
          }
        })
      } else {
        // this cannot happen. Nothing to do, no change
      }
    }
  }

  function createDefaultSelection() {
    debug('createDefaultSelection')

    documentStateStore.update((state) => {
      return {
        ...state,
        selection: createMultiSelection(json || {}, state, [], [])
      }
    })
  }

  export function patch(
    operations: JSONPatchDocument,
    afterPatch?: AfterPatchCallback
  ): JSONPatchResult {
    debug('patch', operations, afterPatch)

    if (json === undefined) {
      throw new Error('Cannot apply patch: no JSON')
    }
    const state = get(documentStateStore)
    const selection = state.selection

    const previousJson = json
    const previousState = state
    const previousText = text
    const previousTextIsRepaired = textIsRepaired
    const previousSelection = selection

    // execute the patch operations
    const undo: JSONPatchDocument = revertJSONPatch(json, operations) as JSONPatchDocument
    const patched = documentStatePatch(json, get(documentStateStore), operations)

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
    $documentStateStore = newState
    // FIXME: cleanup after solved
    // setTimeout(() => {
    //   // FIXME: this is a workaround to trigger all listeners to refresh *after* re-rendering
    //   $documentStateStore = $documentStateStore
    // })
    text = undefined
    textIsRepaired = false

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

  function hasSelectionContents(selection: Selection | undefined): boolean {
    return isMultiSelection(selection) || isKeySelection(selection) || isValueSelection(selection)
  }

  function handleEditKey() {
    const selection = get(documentStateStore).selection

    if (readOnly || !selection) {
      return
    }

    updateSelection(createKeySelection(selection.focusPath, true))
  }

  function handleEditValue() {
    const selection = get(documentStateStore).selection

    if (readOnly || !selection) {
      return
    }

    updateSelection(createValueSelection(selection.focusPath, true))
  }

  function handleToggleEnforceString() {
    debug('handleToggleEnforceString')
    const documentState = get(documentStateStore)
    const selection = documentState.selection

    if (readOnly || !isValueSelection(selection)) {
      return
    }

    const path = selection.focusPath
    const pointer = compileJSONPointer(path)
    const enforceString = !getEnforceString(json, documentState, pointer)

    const updatedDocumentState = setEnforceString(documentState, pointer, enforceString)
    documentStateStore.set(updatedDocumentState)

    const value = getIn(json, path)
    const updatedValue = enforceString ? String(value) : stringConvert(String(value))

    if (updatedValue !== value) {
      handlePatch([
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: updatedValue
        }
      ])
    }
  }

  export function acceptAutoRepair() {
    if (textIsRepaired && json !== undefined) {
      handleChangeJson(json)
    }

    return { json, text }
  }

  async function handleCut(indent = true) {
    const selection = get(documentStateStore).selection

    if (readOnly || !hasSelectionContents(selection)) {
      return
    }

    const cutIndentation = indent ? indentation : null
    const clipboard = selectionToPartialJson(json, selection, cutIndentation)
    if (clipboard == null) {
      return
    }

    debug('cut', { selection, clipboard, indent })

    try {
      await navigator.clipboard.writeText(clipboard)
    } catch (err) {
      onError(err)
    }

    const { operations, newSelection } = createRemoveOperations(
      json,
      get(documentStateStore),
      selection
    )

    handlePatch(operations, () => ({
      selection: newSelection
    }))
  }

  async function handleCopy(indent = true) {
    const selection = get(documentStateStore).selection
    const copyIndentation = indent ? indentation : null
    const clipboard = selectionToPartialJson(json, selection, copyIndentation)
    if (clipboard == null) {
      return
    }

    debug('copy', { clipboard, indent })

    try {
      await navigator.clipboard.writeText(clipboard)
    } catch (err) {
      onError(err)
    }
  }

  function handlePaste(event) {
    event.preventDefault()

    if (readOnly) {
      return
    }

    const clipboardText = event.clipboardData.getData('text/plain')

    try {
      doPaste(clipboardText)
    } catch (err) {
      openRepairModal(clipboardText, (repairedText) => {
        debug('repaired pasted text: ', repairedText)
        doPaste(repairedText)
      })
    }
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
        onClose: () => setTimeout(onFocus)
      }
    )
  }

  function doPaste(clipboardText) {
    if (json !== undefined) {
      if (!get(documentStateStore).selection) {
        createDefaultSelection()
      }

      const state = get(documentStateStore)
      const operations = insert(json, state, clipboardText)

      debug('paste', { clipboardText, operations, selection: state.selection })

      handlePatch(operations, (patchedJson, patchedState) => {
        let updatedState = patchedState

        // expand newly inserted object/array
        operations
          .filter(
            (operation) =>
              (isJSONPatchAdd(operation) || isJSONPatchReplace(operation)) &&
              isObjectOrArray(operation.value)
          )
          .forEach((operation) => {
            const path = parseJSONPointerWithArrayIndices(json, operation.path)
            updatedState = expandRecursive(patchedJson, updatedState, path)
          })

        return {
          state: updatedState
        }
      })
    } else {
      debug('paste text', { clipboardText })

      handleChangeText(clipboardText, (patchedJson, patchedState) => {
        if (patchedJson) {
          const path = []
          return {
            state: expandRecursive(patchedJson, patchedState, path)
          }
        }
      })
    }
  }

  function openRepairModal(text, onApply) {
    open(
      JSONRepairModal,
      {
        text,
        onParse: parsePartialJson,
        onRepair: repairPartialJson,
        onApply,
        onRenderMenu,
        onFocus,
        onBlur
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
    const state = get(documentStateStore)
    const selection = state.selection

    if (readOnly || !selection) {
      return
    }

    // in case of a selected key or value, we change the selection to the whole
    // entry to remove this, we do not want to clear a key or value only.
    const removeSelection =
      isKeySelection(selection) || isValueSelection(selection)
        ? createMultiSelection(json, state, selection.anchorPath, selection.focusPath)
        : selection

    if (isEmpty(selection.focusPath)) {
      // root selected -> clear complete document
      debug('remove root', { selection })

      const patchResult = null

      onChange({ text: '', json: undefined }, { text, json }, patchResult)
    } else {
      // remove selection
      const { operations, newSelection } = createRemoveOperations(json, state, removeSelection)

      debug('remove', { operations, selection, newSelection })

      handlePatch(operations, () => ({
        selection: newSelection
      }))
    }
  }

  function handleDuplicate() {
    const state = get(documentStateStore)
    const selection = state.selection

    if (
      readOnly ||
      !hasSelectionContents(selection) ||
      isEmpty(selection.focusPath) // root selected, cannot duplicate
    ) {
      return
    }

    debug('duplicate', { selection })

    const operations = duplicate(json, state, getSelectionPaths(selection))

    handlePatch(operations)
  }

  function handleExtract() {
    const state = get(documentStateStore)
    const selection = state.selection

    if (
      readOnly ||
      !selection ||
      (!isMultiSelection(selection) && !isValueSelection(selection)) ||
      isEmpty(selection.focusPath) // root selected, cannot extract
    ) {
      return
    }

    debug('extract', { selection })

    const operations = extract(json, selection)

    handlePatch(operations, (patchedJson, patchedState) => {
      if (isObjectOrArray(patchedJson)) {
        // expand extracted object/array
        const path = []
        return {
          state: expandRecursive(patchedJson, patchedState, path)
        }
      }
    })

    focus() // TODO: find a more robust way to keep focus than sprinkling focus() everywhere
  }

  function handleInsert(type: InsertType): void {
    const state = get(documentStateStore)
    const selection = state.selection

    if (readOnly || !selection) {
      return
    }

    const newValue = createNewValue(json, selection, type)

    if (json !== undefined) {
      const data = JSON.stringify(newValue)
      const operations = insert(json, state, data)
      debug('handleInsert', { type, operations, newValue, data })

      const operation = last(
        operations.filter((operation) => operation.op === 'add' || operation.op === 'replace')
      )

      handlePatch(operations, (patchedJson, patchedState) => {
        // TODO: extract determining the newSelection in a separate function
        if (operation) {
          const path = parseJSONPointerWithArrayIndices(patchedJson, operation.path)

          if (isObjectOrArray(newValue)) {
            return {
              state: expandWithCallback(patchedJson, patchedState, path, expandAll),
              selection: createInsideSelection(path)
            }
          }

          if (newValue === '') {
            // open the newly inserted value in edit mode
            const parent = !isEmpty(path) ? getIn(patchedJson, initial(path)) : null

            return {
              selection: isObject(parent)
                ? createKeySelection(path, true)
                : createValueSelection(path, true)
            }
          }

          return undefined
        }
      })

      if (operation) {
        focus() // TODO: find a more robust way to keep focus than sprinkling focus() everywhere

        if (newValue === '') {
          // open the newly inserted value in edit mode
          tick().then(() => {
            setTimeout(() => insertActiveElementContents('', true))
          })
        }
      }
    } else {
      // document is empty or invalid (in that case it has text but no json)
      debug('handleInsert', { type, newValue })

      const path = []
      handleChangeJson(newValue, (patchedJson, patchedState) => ({
        state: expandRecursive(patchedJson, patchedState, path),
        selection: createInsideSelection(path)
      }))

      focus() // TODO: find a more robust way to keep focus than sprinkling focus() everywhere
    }
  }

  /**
   * @param {'value' | 'object' | 'array' | 'structure'} type
   */
  function handleInsertFromContextMenu(type) {
    const selection = get(documentStateStore).selection

    if (isKeySelection(selection)) {
      // in this case, we do not want to rename the key, but replace the property
      updateSelection(createValueSelection(selection.focusPath, false))
    }

    handleInsert(type)
  }

  /**
   * @param {'value' | 'object' | 'array'} type
   */
  function handleConvert(type) {
    const selection = get(documentStateStore).selection

    if (readOnly || !selection) {
      return
    }

    if (!canConvert(selection)) {
      onError(new Error(`Cannot convert current selection to ${type}`))
      return
    }

    try {
      const path = selection.anchorPath
      const currentValue: JSONData = getIn(json, path) as JSONData
      const convertedValue = convertValue(currentValue, type)
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
          state: expandRecursive(patchedJson, patchedState, selection.focusPath)
        }
      })

      focus() // TODO: find a more robust way to keep focus than sprinkling focus() everywhere
    } catch (err) {
      onError(err)
    }
  }

  function handleInsertBefore() {
    const state = get(documentStateStore)
    const selection = state.selection
    const selectionBefore = getSelectionUp(json, state, false)
    const parentPath: Path = initial(selection.focusPath)

    if (
      !isEmpty(selectionBefore.focusPath) &&
      isEqual(parentPath, initial(selectionBefore.focusPath))
    ) {
      updateSelection(createAfterSelection(selectionBefore.focusPath))
    } else {
      updateSelection(createInsideSelection(parentPath))
    }

    debug('insert before', { selection, selectionBefore, parentPath })

    tick().then(handleContextMenu)
  }

  function handleInsertAfter() {
    const selection = get(documentStateStore).selection

    const path: Path = isMultiSelection(selection) ? last(selection.paths) : selection.focusPath

    debug('insert after', path)

    updateSelection(createAfterSelection(path))

    tick().then(handleContextMenu)
  }

  /**
   * Insert (append or replace) the text contents of the current active element
   * @param {string} char
   * @param {boolean} replaceContents
   */
  function insertActiveElementContents(char, replaceContents) {
    const activeElement = getWindow(refJsonEditor).document.activeElement
    if (activeElement.isContentEditable) {
      activeElement.textContent = replaceContents ? char : activeElement.textContent + char
      setCursorToEnd(activeElement)
      // FIXME: should trigger an oninput, else the component will not update it's newKey/newValue variable
    }
  }

  async function handleInsertCharacter(char) {
    const selection = get(documentStateStore).selection

    // a regular key like a, A, _, etc is entered.
    // Replace selected contents with a new value having this first character as text
    if (readOnly || !selection) {
      return
    }

    if (isKeySelection(selection)) {
      // only replace contents when not yet in edit mode (can happen when entering
      // multiple characters very quickly after each other due to the async handling)
      const replaceContents = !selection.edit

      updateSelection({ ...selection, edit: true })
      await tick()
      setTimeout(() => insertActiveElementContents(char, replaceContents))
      return
    }

    if (char === '{') {
      handleInsert('object')
    } else if (char === '[') {
      handleInsert('array')
    } else {
      if (isValueSelection(selection)) {
        if (!isObjectOrArray(getIn(json, selection.focusPath as JSONPath))) {
          // only replace contents when not yet in edit mode (can happen when entering
          // multiple characters very quickly after each other due to the async handling)
          const replaceContents = !selection.edit

          updateSelection({ ...selection, edit: true })
          await tick()
          setTimeout(() => insertActiveElementContents(char, replaceContents))
        } else {
          // TODO: replace the object/array with editing a text in edit mode?
          //  (Ideally this this should not create an entry in history though,
          //  which isn't really possible right now since we have to apply
          //  a patch to change the object/array into a value)
        }
      } else {
        await handleInsertValueWithCharacter(char)
      }
    }
  }

  async function handleInsertValueWithCharacter(char) {
    const selection = get(documentStateStore).selection

    if (readOnly || !selection) {
      return
    }

    // first insert a new value
    handleInsert('value')

    // only replace contents when not yet in edit mode (can happen when entering
    // multiple characters very quickly after each other due to the async handling)
    const replaceContents = !isEditingSelection(selection)

    // next, open the new value in edit mode and apply the current character
    const path = selection.focusPath
    const parent = getIn(json, initial(path) as JSONPath)

    if (Array.isArray(parent) || !parent || isValueSelection(selection)) {
      updateSelection(createValueSelection(path, true))
    } else {
      updateSelection(createKeySelection(path, true))
    }

    await tick()
    setTimeout(() => insertActiveElementContents(char, replaceContents))
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

    updateSelection(item.undo.state.selection)
    json = item.undo.patch
      ? (immutableJSONPatch(json, item.undo.patch) as JSONData)
      : item.undo.json
    const state = item.undo.state
    text = item.undo.text
    textIsRepaired = item.undo.textIsRepaired

    const selection = state.selection
    debug('undo', { item, json, state, selection })

    const patchResult = {
      json,
      previousJson: previousContent.json,
      redo: item.undo.patch,
      undo: item.redo.patch
    }

    emitOnChange(previousContent, patchResult)

    focus()
    if (selection) {
      scrollTo(selection.focusPath)
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

    updateSelection(item.redo.state.selection)
    json = item.redo.patch
      ? (immutableJSONPatch(json, item.redo.patch) as JSONData)
      : item.redo.json
    const state = item.redo.state
    text = item.redo.text
    textIsRepaired = item.redo.textIsRepaired

    const selection = get(documentStateStore).selection
    debug('redo', { item, json, state, selection })

    const patchResult = {
      json,
      previousJson: previousContent.json,
      redo: item.redo.patch,
      undo: item.undo.patch
    }

    emitOnChange(previousContent, patchResult)

    focus()
    if (selection) {
      scrollTo(selection.focusPath)
    }
  }

  function openSortModal(selectedPath) {
    if (readOnly) {
      return
    }

    modalOpen = true

    onSortModal({
      id: sortModalId,
      json,
      selectedPath,
      onSort: async (operations) => {
        debug('onSort', selectedPath, operations)

        handlePatch(operations, (patchedJson, patchedState) => ({
          // expand the newly replaced array and select it
          state: expandRecursive(patchedJson, patchedState, selectedPath),
          selection: createInsideSelection(selectedPath)
        }))
      },
      onClose: () => {
        modalOpen = false
        focus()
      }
    })
  }

  function handleSortSelection() {
    const selection = get(documentStateStore).selection

    if (!selection) {
      return
    }

    const selectedPath = findRootPath(json, selection)
    openSortModal(selectedPath)
  }

  function handleSortAll() {
    const selectedPath = []
    openSortModal(selectedPath)
  }

  /**
   * This method is exposed via JSONEditor.transform
   */
  export function openTransformModal({
    id,
    selectedPath,
    onTransform,
    onClose
  }: TransformModalOptions) {
    modalOpen = true

    onTransformModal({
      id: id || transformModalId,
      json,
      selectedPath,
      onTransform: onTransform
        ? (operations) => {
            onTransform({
              operations,
              json,
              transformedJson: immutableJSONPatch(json, operations) as JSONData
            })
          }
        : (operations) => {
            debug('onTransform', selectedPath, operations)

            handlePatch(operations, (patchedJson, patchedState) => ({
              // expand the newly replaced array and select it
              state: expandRecursive(patchedJson, patchedState, selectedPath),
              selection: createValueSelection(selectedPath, false)
            }))
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
    const selection = get(documentStateStore).selection

    if (!selection) {
      return
    }

    const selectedPath = findRootPath(json, selection)
    openTransformModal({
      selectedPath
    })
  }

  function handleTransformAll() {
    openTransformModal({
      selectedPath: []
    })
  }

  /**
   * Scroll the window vertically to the node with given path
   */
  export async function scrollTo(path: Path) {
    documentStateStore.update((state) => expandPath(json, state, path))
    await tick()

    const elem = findElement(path)
    if (elem) {
      debug('scrollTo', { path, elem, refContents })

      const offset = -(refContents.getBoundingClientRect().height / 4)

      jump(elem, {
        container: refContents,
        offset,
        duration: SCROLL_DURATION
      })
    }
  }

  /**
   * Find the DOM element of a given path.
   * Note that the path can only be found when the node is expanded.
   */
  export function findElement(path: Path): Element | null {
    return refContents
      ? refContents.querySelector(`div[data-path="${encodeDataPath(path)}"]`)
      : null
  }

  /**
   * If given path is outside the visible viewport, scroll up/down.
   * When the path is already in view, nothing is done
   */
  function scrollIntoView(path: Path) {
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

  /**
   * @param {Content} previousContent
   * @param {JSONPatchResult | null} patchResult
   */
  function emitOnChange(previousContent, patchResult) {
    // make sure we cannot send an invalid contents like having both
    // json and text defined, or having none defined
    if (text !== undefined) {
      onChange({ text, json: undefined }, previousContent, patchResult)
    } else if (json !== undefined) {
      onChange({ text: undefined, json }, previousContent, patchResult)
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

    const previousContent = { json, text }
    const patchResult = patch(operations, afterPatch)

    pastedJson = undefined

    emitOnChange(previousContent, patchResult)

    return patchResult
  }

  function handleChangeJson(updatedJson: JSONData, afterPatch?: AfterPatchCallback) {
    const previousState = get(documentStateStore)
    const previousJson = json
    const previousText = text
    const previousContent = { json, text }
    const previousTextIsRepaired = textIsRepaired
    const previousSelection = previousState.selection

    const state = get(documentStateStore)
    const selection = state.selection
    const updatedState = expandWithCallback(json, state, rootPath, expandMinimal)

    const callback =
      typeof afterPatch === 'function'
        ? afterPatch(updatedJson, updatedState, selection)
        : undefined

    json = callback && callback.json !== undefined ? callback.json : updatedJson
    documentStateStore.set(callback && callback.state !== undefined ? callback.state : updatedState)
    text = undefined
    textIsRepaired = false
    if (callback && callback.selection) {
      updateSelection(callback.selection)
    }

    // make sure the selection is valid
    clearSelectionWhenNotExisting(json)

    addHistoryItem({
      previousJson,
      previousState,
      previousText,
      previousTextIsRepaired,
      previousSelection
    })

    // TODO: work out the patchResult when fully replacing json (is just a replace of the root)
    const patchResult = null

    emitOnChange(previousContent, patchResult)
  }

  function handleChangeText(updatedText: string, afterPatch?: AfterPatchCallback) {
    const state = get(documentStateStore)
    const previousState = state
    const previousJson = json
    const previousText = text
    const previousContent = { json, text }
    const previousTextIsRepaired = textIsRepaired
    const previousSelection = previousState.selection

    try {
      json = JSON.parse(updatedText)
      documentStateStore.update((state) => expandWithCallback(json, state, rootPath, expandMinimal))
      text = undefined
      textIsRepaired = false
    } catch (err) {
      try {
        json = JSON.parse(jsonrepair(updatedText))
        documentStateStore.update((state) =>
          expandWithCallback(json, state, rootPath, expandMinimal)
        )
        text = updatedText
        textIsRepaired = true
      } catch (err) {
        // no valid JSON, will show empty document or invalid json
        json = undefined
        documentStateStore.set(createDocumentState({ json, expand: expandMinimal }))
        text = updatedText
        textIsRepaired = false
      }
    }

    if (typeof afterPatch === 'function') {
      const callback = afterPatch(json, state, get(documentStateStore).selection)

      json = callback && callback.json ? callback.json : json
      documentStateStore.set(callback && callback.state ? callback.state : state)
      if (callback && callback.selection) {
        updateSelection(callback.selection)
      }
    }

    // ensure the selection is valid
    clearSelectionWhenNotExisting(json)

    addHistoryItem({
      previousJson,
      previousState,
      previousText,
      previousTextIsRepaired,
      previousSelection
    })

    // no JSON patch actions available in text mode
    const patchResult = null

    emitOnChange(previousContent, patchResult)
  }

  /**
   * Expand recursively when the expanded contents is small enough,
   * else expand in a minimalistic way
   */
  function expandRecursive(
    json: JSONData,
    documentState: DocumentState,
    path: Path
  ): DocumentState {
    const expandContents = getIn(json, path) as JSONData
    const expandAllRecursive = !isLargeContent(
      { json: expandContents },
      MAX_DOCUMENT_SIZE_EXPAND_ALL
    )
    const expandCallback = expandAllRecursive ? expandAll : expandMinimal

    return expandWithCallback(json, documentState, path, expandCallback)
  }

  // FIXME: cleanup
  documentStateStore.subscribe((documentState) => {
    debug('documentState', documentState)
  })

  /**
   * Toggle expanded state of a node
   * @param path The path to be expanded
   * @param expanded  True to expand, false to collapse
   * @param [recursive=false]  Only applicable when expanding
   */
  function handleExpand(path: Path, expanded: boolean, recursive = false): void {
    debug('expand', { path, expanded, recursive })

    if (expanded) {
      if (recursive) {
        documentStateStore.update((state) => expandWithCallback(json, state, path, expandAll))
      } else {
        documentStateStore.update((state) => expandSingleItem(state, path))
      }
    } else {
      documentStateStore.update((state) => collapsePath(state, path))
    }

    const selection = get(documentStateStore).selection
    if (selection && !expanded) {
      // check whether the selection is still visible and not collapsed
      if (isSelectionInsidePath(selection, path)) {
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

  function handleSelect(
    selection: Selection,
    options?: { ensureFocus?: boolean; nextInside?: boolean }
  ): void {
    updateSelection(
      options?.nextInside
        ? getSelectionNextInside(json, get(documentStateStore), selection.focusPath)
        : selection
    )

    // set focus to the hidden input, so we can capture quick keys like Ctrl+X, Ctrl+C, Ctrl+V
    // we do this after a setTimeout in case the selection was made by clicking a button
    if (options?.ensureFocus !== false) {
      setTimeout(() => focus())
    }
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

  function handleExpandSection(path: Path, section: Section) {
    debug('handleExpandSection', path, section)

    const pointer = compileJSONPointer(path)
    documentStateStore.update((state) => expandSection(json, state, pointer, section))
  }

  function handlePasteJson(newPastedJson: PastedJson) {
    debug('pasted json as text', newPastedJson)

    pastedJson = newPastedJson
  }

  function handleKeyDown(event) {
    // get key combo, and normalize key combo from Mac: replace "Command+X" with "Ctrl+X" etc
    const combo = keyComboFromEvent(event).replace(/^Command\+/, 'Ctrl+')
    const keepAnchorPath = event.shiftKey
    const state = get(documentStateStore)
    const selection = state.selection

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
    // Ctrl+V (paste) is handled by the on:paste event

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

    if (combo === 'Up' || combo === 'Shift+Up') {
      event.preventDefault()
      updateSelection((selection) =>
        selection
          ? getSelectionUp(json, state, keepAnchorPath, true) || selection
          : getInitialSelection(json, state)
      )

      scrollIntoView(selection.focusPath)
    }
    if (combo === 'Down' || combo === 'Shift+Down') {
      event.preventDefault()
      updateSelection((selection) =>
        selection
          ? getSelectionDown(json, state, keepAnchorPath, true) || selection
          : getInitialSelection(json, state)
      )

      scrollIntoView(selection.focusPath)
    }
    if (combo === 'Left' || combo === 'Shift+Left') {
      event.preventDefault()
      updateSelection((selection) =>
        selection
          ? getSelectionLeft(json, state, keepAnchorPath, !readOnly) || selection
          : getInitialSelection(json, state)
      )

      scrollIntoView(selection.focusPath)
    }
    if (combo === 'Right' || combo === 'Shift+Right') {
      event.preventDefault()
      updateSelection((selection) =>
        selection
          ? getSelectionRight(json, state, keepAnchorPath, !readOnly) || selection
          : getInitialSelection(json, state)
      )

      scrollIntoView(selection.focusPath)
    }

    if (combo === 'Enter' && selection) {
      // when the selection consists of a single Array item, change selection to editing its value
      if (!readOnly && isMultiSelection(selection) && selection.paths.length === 1) {
        const path = selection.focusPath
        const parent = getIn(json, initial(path))
        if (Array.isArray(parent)) {
          // change into selection of the value
          updateSelection(createValueSelection(path, false))
        }
      }

      if (!readOnly && isKeySelection(selection)) {
        // go to key edit mode
        event.preventDefault()
        updateSelection({ ...selection, edit: true })
      }

      if (isValueSelection(selection)) {
        event.preventDefault()

        const value = getIn(json, selection.focusPath as JSONPath)
        if (isObjectOrArray(value)) {
          // expand object/array
          handleExpand(selection.focusPath, true)
        } else {
          if (!readOnly) {
            // go to value edit mode
            updateSelection({ ...selection, edit: true })
          }
        }
      }
    }

    if (combo.length === (combo.startsWith('Shift+') ? 7 : 1) && selection) {
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
      const value = getIn(json, selection.focusPath as JSONPath)

      if (isUrl(value)) {
        // open url in new page
        window.open(String(value), '_blank')
      }
    }

    if (combo === 'Escape' && selection) {
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

    // TODO: ugly to have to have two setTimeout here. Without it, hiddenInput will blur
    setTimeout(() => {
      setTimeout(() => {
        if (!hasFocus && !isChildOfNodeName(event.target, 'BUTTON')) {
          // for example when clicking on the empty area in the main menu
          focus()

          if (
            !get(documentStateStore).selection &&
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
      documentState: get(documentStateStore),
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
        closeAbsolutePopup()
        focus()
      }
    }

    modalOpen = true

    openAbsolutePopup(ContextMenu, props, {
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
    const selection = get(documentStateStore).selection

    if (readOnly || isEditingSelection(selection)) {
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
      const anchor = refContents?.querySelector('.jse-context-menu-button.jse-selected')
      if (anchor) {
        openContextMenu({
          anchor,
          offsetTop: 2,
          width: CONTEXT_MENU_WIDTH,
          height: CONTEXT_MENU_HEIGHT,
          showTip: false
        })
      } else {
        // fallback on just displaying the ContextMenu top left
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

  function handleNavigationBarSelect(newSelection: Selection) {
    updateSelection(newSelection)

    focus()
    scrollTo(newSelection.focusPath)
  }

  export function focus() {
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
      const selection = get(documentStateStore).selection

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

  function getFullJson(): JSONData {
    return json
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
    documentStateStore,
    readOnly,
    normalization,
    getFullJson,
    findElement,
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
    onClassName,
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
      selection={$documentStateStore.selection}
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
      documentState={$documentStateStore}
      onSelect={handleNavigationBarSelect}
    />
  {/if}

  {#if !isSSR}
    <label class="jse-hidden-input-label">
      <input
        class="jse-hidden-input"
        tabindex="-1"
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
                  onClick: onRequestRepair
                }
              ]
            : []}
        />
        <div class="jse-preview">
          {text}
        </div>
      {/if}
    {:else}
      <div class="jse-search-box-container">
        <SearchBox
          show={showSearch}
          resultCount={searchResult?.itemsList?.length || 0}
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
          pointer={''}
          expandedMap={$documentStateStore.expandedMap}
          enforceStringMap={$documentStateStore.enforceStringMap}
          keysMap={$documentStateStore.keysMap}
          visibleSectionsMap={$documentStateStore.visibleSectionsMap}
          {validationErrorsMap}
          searchResultItemsMap={searchResult?.itemsMap}
          selection={$documentStateStore.selection}
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
                  onClick: onRequestRepair
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
