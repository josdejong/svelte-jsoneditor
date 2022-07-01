<svelte:options immutable={true} />

<script lang="ts">
  import { createAutoScrollHandler } from '../../controls/createAutoScrollHandler'
  import { faCheck, faCode, faWrench } from '@fortawesome/free-solid-svg-icons'
  import { createDebug } from '$lib/utils/debug'
  import type { JSONData, JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import {
    compileJSONPointer,
    existsIn,
    getIn,
    immutableJSONPatch,
    isJSONPatchAdd,
    isJSONPatchReplace,
    parsePath
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
    insert,
    revertJSONPatchWithMoveOperations
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
    JSONPatchResult,
    JSONPointerMap,
    OnChange,
    OnClassName,
    OnRenderValue,
    PastedJson,
    SearchResult,
    Section,
    Selection,
    TransformModalOptions,
    TreeModeContext,
    ValidationError,
    Validator,
    ValueNormalization
  } from '$lib/types'
  import { isAfterSelection, isInsideSelection, isKeySelection } from '../../../logic/selection'

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

    const updatedSelection =
      typeof selection === 'function' ? selection(documentState.selection) : selection

    if (!isEqual(updatedSelection, documentState.selection)) {
      documentState = {
        ...documentState,
        selection: updatedSelection
      }
    }
  }

  let documentState = createDocumentState({ json, expand: getDefaultExpand(json) })
  let searchResult: SearchResult | undefined

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
      documentState,
      replacementText,
      activeItem
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
      replacementText
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
      const newResultItems = search(searchText, json, documentState, MAX_SEARCH_RESULTS)
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
  }

  const history = createHistory<HistoryItem>({
    onChange: (state) => {
      historyState = state
    }
  })
  let historyState = history.getState()

  export function expand(callback = () => true) {
    debug('expand')

    // clear the expanded state and visible sections (else you can't collapse anything)
    const cleanDocumentState = {
      ...documentState,
      expandedMap: {},
      visibleSectionsMap: {}
    }

    documentState = expandWithCallback(json, cleanDocumentState, rootPath, callback)
  }

  // two-way binding of externalContent and internal json and text (
  // when receiving an updated prop, we have to update state for example
  $: applyExternalContent(externalContent)

  let textIsRepaired = false
  $: textIsUnrepairable = text !== undefined && json === undefined

  let validationErrors: ValidationError[] = []
  $: updateValidationErrors(json, validator)

  let validationErrorsMap: JSONPointerMap<ValidationError>
  $: validationErrorsMap = mapValidationErrors(validationErrors)

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
    const isText = json === undefined

    debug('update external json', { isChanged, isText })

    if (!isChanged) {
      // no actual change, don't do anything
      return
    }

    const previousState = documentState
    const previousJson = json
    const previousText = text
    const previousTextIsRepaired = textIsRepaired

    json = updatedJson
    documentState = expandWithCallback(json, documentState, rootPath, getDefaultExpand(json))
    text = undefined
    textIsRepaired = false
    clearSelectionWhenNotExisting(json)

    addHistoryItem({
      previousJson,
      previousState,
      previousText,
      previousTextIsRepaired
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
    const previousState = documentState
    const previousText = text
    const previousTextIsRepaired = textIsRepaired

    try {
      json = JSON.parse(updatedText)
      documentState = expandWithCallback(json, documentState, rootPath, getDefaultExpand(json))
      text = updatedText
      textIsRepaired = false
      clearSelectionWhenNotExisting(json)
    } catch (err) {
      try {
        json = JSON.parse(jsonrepair(updatedText))
        documentState = expandWithCallback(json, documentState, rootPath, getDefaultExpand(json))
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

    if (!documentState.selection && json === undefined && (text === '' || text === undefined)) {
      // make sure there is a selection,
      // else we cannot paste or insert in case of an empty document
      createDefaultSelection()
    }

    addHistoryItem({
      previousJson,
      previousState,
      previousText,
      previousTextIsRepaired
    })

    // TODO: triggering applySearchThrottled() here should not be needed
    applySearchThrottled()
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
      selection: undefined
    }
  }

  function addHistoryItem({
    previousJson,
    previousState,
    previousText,
    previousTextIsRepaired
  }: {
    previousJson: JSONData | undefined
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
    if (readOnly || !documentState.selection) {
      return
    }

    updateSelection(createKeySelection(documentState.selection.focusPath, true))
  }

  function handleEditValue() {
    if (readOnly || !documentState.selection) {
      return
    }

    updateSelection(createValueSelection(documentState.selection.focusPath, true))
  }

  function handleToggleEnforceString() {
    if (readOnly || !isValueSelection(documentState.selection)) {
      return
    }

    const path = documentState.selection.focusPath
    const pointer = compileJSONPointer(path)
    const value = getIn(json, path)
    const enforceString = !getEnforceString(value, documentState.enforceStringMap, pointer)
    const updatedValue = enforceString ? String(value) : stringConvert(String(value))

    debug('handleToggleEnforceString', { enforceString, value, updatedValue })

    handlePatch(
      [
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: updatedValue
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
      handleChangeJson(json)
    }

    return { json, text }
  }

  async function handleCut(indent = true) {
    if (readOnly || !hasSelectionContents(documentState.selection)) {
      return
    }

    const cutIndentation = indent ? indentation : null
    const clipboard = selectionToPartialJson(json, documentState.selection, cutIndentation)
    if (clipboard == null) {
      return
    }

    debug('cut', { selection: documentState.selection, clipboard, indent })

    try {
      await navigator.clipboard.writeText(clipboard)
    } catch (err) {
      onError(err)
    }

    const { operations, newSelection } = createRemoveOperations(json, documentState.selection)

    handlePatch(operations, (patchedJson, patchedState) => ({
      state: {
        ...patchedState,
        selection: newSelection
      }
    }))
  }

  async function handleCopy(indent = true) {
    const copyIndentation = indent ? indentation : null
    const clipboard = selectionToPartialJson(json, documentState.selection, copyIndentation)
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
      if (!documentState.selection) {
        createDefaultSelection()
      }

      const operations = insert(json, documentState.selection, clipboardText)

      debug('paste', { clipboardText, operations, selection: documentState.selection })

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
            const path = parsePath(json, operation.path)
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

      const patchResult = null

      onChange({ text: '', json: undefined }, { text, json }, patchResult)
    } else {
      // remove selection
      const { operations, newSelection } = createRemoveOperations(json, removeSelection)

      debug('remove', { operations, selection: documentState.selection, newSelection })

      handlePatch(operations, (patchedJson, patchedState) => ({
        state: {
          ...patchedState,
          selection: newSelection
        }
      }))
    }
  }

  function handleDuplicate() {
    if (
      readOnly ||
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

  function handleInsert(type: InsertType): void {
    if (readOnly || !documentState.selection) {
      return
    }

    const newValue = createNewValue(json, documentState.selection, type)

    if (json !== undefined) {
      const data = JSON.stringify(newValue)
      const operations = insert(json, documentState.selection, data)
      debug('handleInsert', { type, operations, newValue, data })

      const operation = last(
        operations.filter((operation) => operation.op === 'add' || operation.op === 'replace')
      )

      handlePatch(operations, (patchedJson, patchedState) => {
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

            debug('test A', path, createInsideSelection(path))
            return {
              state: {
                ...documentState,
                selection: isObject(parent)
                  ? createKeySelection(path, true)
                  : createValueSelection(path, true)
              }
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
            setTimeout(() => insertActiveElementContents('', true))
          })
        }
      }
    } else {
      // document is empty or invalid (in that case it has text but no json)
      debug('handleInsert', { type, newValue })

      const path = []
      handleChangeJson(newValue, (patchedJson, patchedState) => ({
        state: {
          ...expandRecursive(patchedJson, patchedState, path),
          selection: createInsideSelection(path)
        }
      }))
    }
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
      const currentValue: JSONData = getIn(json, path)
      const convertedValue = convertValue(currentValue, type)
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
    // a regular key like a, A, _, etc is entered.
    // Replace selected contents with a new value having this first character as text
    if (readOnly || !documentState.selection) {
      return
    }

    if (isKeySelection(documentState.selection)) {
      // only replace contents when not yet in edit mode (can happen when entering
      // multiple characters very quickly after each other due to the async handling)
      const replaceContents = !documentState.selection.edit

      updateSelection({ ...documentState.selection, edit: true })
      await tick()
      setTimeout(() => insertActiveElementContents(char, replaceContents))
      return
    }

    if (char === '{') {
      handleInsert('object')
    } else if (char === '[') {
      handleInsert('array')
    } else {
      if (isValueSelection(documentState.selection)) {
        if (!isObjectOrArray(getIn(json, documentState.selection.focusPath))) {
          // only replace contents when not yet in edit mode (can happen when entering
          // multiple characters very quickly after each other due to the async handling)
          const replaceContents = !documentState.selection.edit

          updateSelection({ ...documentState.selection, edit: true })
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
    if (readOnly || !documentState.selection) {
      return
    }

    // first insert a new value
    handleInsert('value')

    // only replace contents when not yet in edit mode (can happen when entering
    // multiple characters very quickly after each other due to the async handling)
    const replaceContents = !isEditingSelection(documentState.selection)

    // next, open the new value in edit mode and apply the current character
    const path = documentState.selection.focusPath
    const parent = getIn(json, initial(path))

    if (Array.isArray(parent) || !parent || isValueSelection(documentState.selection)) {
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

    // Note: from the documentState, we only undo the selection and enforceStringMap,
    // not the expandedMap or visibleSectionsMap. At the end, we scroll to the selection
    // and will expand that if needed
    json = item.undo.patch ? immutableJSONPatch(json, item.undo.patch) : item.undo.json
    documentState = {
      ...documentState,
      enforceStringMap: item.undo.state.enforceStringMap,
      selection: item.undo.state.selection
    }
    text = item.undo.text
    textIsRepaired = item.undo.textIsRepaired

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
      scrollTo(documentState.selection.focusPath)
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

    // Note: from the documentState, we only redo the selection and enforceStringMap,
    // not the expandedMap or visibleSectionsMap. At the end, we scroll to the selection
    // and will expand that if needed
    json = item.redo.patch ? immutableJSONPatch(json, item.redo.patch) : item.redo.json
    documentState = {
      ...documentState,
      enforceStringMap: item.redo.state.enforceStringMap,
      selection: item.redo.state.selection
    }
    text = item.redo.text
    textIsRepaired = item.redo.textIsRepaired

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
      scrollTo(documentState.selection.focusPath)
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
          state: {
            ...expandRecursive(patchedJson, patchedState, selectedPath),
            selection: createInsideSelection(selectedPath)
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

    const selectedPath = findRootPath(json, documentState.selection)
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
              transformedJson: immutableJSONPatch(json, operations)
            })
          }
        : (operations) => {
            debug('onTransform', selectedPath, operations)

            handlePatch(operations, (patchedJson, patchedState) => ({
              // expand the newly replaced array and select it
              state: {
                ...expandRecursive(patchedJson, patchedState, selectedPath),
                selection: createValueSelection(selectedPath, false)
              }
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
    if (!documentState.selection) {
      return
    }

    const selectedPath = findRootPath(json, documentState.selection)
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
  export async function scrollTo(path: JSONPath) {
    documentState = expandPath(json, documentState, path)
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
    const previousState = documentState
    const previousJson = json
    const previousText = text
    const previousContent = { json, text }
    const previousTextIsRepaired = textIsRepaired

    const updatedState = expandWithCallback(json, documentState, rootPath, expandMinimal)

    const callback =
      typeof afterPatch === 'function' ? afterPatch(updatedJson, updatedState) : undefined

    json = callback && callback.json !== undefined ? callback.json : updatedJson
    documentState = callback && callback.state !== undefined ? callback.state : updatedState
    text = undefined
    textIsRepaired = false

    // make sure the selection is valid
    clearSelectionWhenNotExisting(json)

    addHistoryItem({
      previousJson,
      previousState,
      previousText,
      previousTextIsRepaired
    })

    // TODO: work out the patchResult when fully replacing json (is just a replace of the root)
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
      json = JSON.parse(updatedText)
      documentState = expandWithCallback(json, documentState, rootPath, expandMinimal)
      text = undefined
      textIsRepaired = false
    } catch (err) {
      try {
        json = JSON.parse(jsonrepair(updatedText))
        documentState = expandWithCallback(json, documentState, rootPath, expandMinimal)
        text = updatedText
        textIsRepaired = true
      } catch (err) {
        // no valid JSON, will show empty document or invalid json
        json = undefined
        documentState = createDocumentState({ json, expand: expandMinimal })
        text = updatedText
        textIsRepaired = false
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
   * Expand recursively when the expanded contents is small enough,
   * else expand in a minimalistic way
   */
  function expandRecursive(
    json: JSONData,
    documentState: DocumentState,
    path: JSONPath
  ): DocumentState {
    const expandContents = getIn(json, path)
    const expandAllRecursive = !isLargeContent(
      { json: expandContents },
      MAX_DOCUMENT_SIZE_EXPAND_ALL
    )
    const expandCallback = expandAllRecursive ? expandAll : expandMinimal

    return expandWithCallback(json, documentState, path, expandCallback)
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
    // get key combo, and normalize key combo from Mac: replace "Command+X" with "Ctrl+X" etc
    const combo = keyComboFromEvent(event).replace(/^Command\+/, 'Ctrl+')
    const keepAnchorPath = event.shiftKey

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

      const newSelection = documentState.selection
        ? getSelectionUp(json, documentState, keepAnchorPath, true) || documentState.selection
        : getInitialSelection(json, documentState)

      updateSelection(newSelection)
      scrollIntoView(newSelection.focusPath)
    }
    if (combo === 'Down' || combo === 'Shift+Down') {
      event.preventDefault()

      const newSelection = documentState.selection
        ? getSelectionDown(json, documentState, keepAnchorPath, true) || documentState.selection
        : getInitialSelection(json, documentState)

      updateSelection(newSelection)
      scrollIntoView(newSelection.focusPath)
    }
    if (combo === 'Left' || combo === 'Shift+Left') {
      event.preventDefault()

      const newSelection = documentState.selection
        ? getSelectionLeft(json, documentState, keepAnchorPath, !readOnly) ||
          documentState.selection
        : getInitialSelection(json, documentState)

      updateSelection(newSelection)
      scrollIntoView(newSelection.focusPath)
    }
    if (combo === 'Right' || combo === 'Shift+Right') {
      event.preventDefault()

      const newSelection = documentState.selection
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

    if (combo.length === (combo.startsWith('Shift+') ? 7 : 1) && documentState.selection) {
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

    // TODO: ugly to have to have two setTimeout here. Without it, hiddenInput will blur
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
    normalization,
    getJson,
    getDocumentState,
    findElement,
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
    <NavigationBar {json} {documentState} onSelect={handleNavigationBarSelect} />
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
          path={rootPath}
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
