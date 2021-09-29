<svelte:options immutable={true} />

<script>
  import { createAutoScrollHandler } from '$lib/components/controls/createAutoScrollHandler'
  import { faCheck, faCode, faWrench } from '@fortawesome/free-solid-svg-icons'
  import createDebug from 'debug'
  import {
    compileJSONPointer,
    existsIn,
    getIn,
    immutableJSONPatch,
    revertJSONPatch,
    setIn,
    updateIn
  } from 'immutable-json-patch'
  import jsonrepair from 'jsonrepair'
  import { initial, isEmpty, isEqual, last, throttle, uniqueId } from 'lodash-es'
  import { getContext, onDestroy, onMount, tick } from 'svelte'
  import { createJump } from '$lib/assets/jump.js/src/jump'
  import {
    CONTEXT_MENU_HEIGHT,
    CONTEXT_MENU_WIDTH,
    MAX_SEARCH_RESULTS,
    SCROLL_DURATION,
    SEARCH_UPDATE_THROTTLE,
    SIMPLE_MODAL_OPTIONS,
    SORT_MODAL_OPTIONS,
    STATE_EXPANDED,
    TRANSFORM_MODAL_OPTIONS
  } from '$lib/constants'
  import {
    createState,
    documentStatePatch,
    expandPath,
    expandSection,
    syncState
  } from '$lib/logic/documentState'
  import { createHistory } from '$lib/logic/history'
  import {
    createNewValue,
    createRemoveOperations,
    duplicate,
    extract,
    insert
  } from '$lib/logic/operations'
  import { search, searchNext, searchPrevious, updateSearchResult } from '$lib/logic/search'
  import {
    createSelection,
    createSelectionFromOperations,
    findRootPath,
    getInitialSelection,
    getSelectionDown,
    getSelectionLeft,
    getSelectionRight,
    getSelectionUp,
    isSelectionInsidePath,
    removeEditModeFromSelection,
    selectAll,
    SELECTION_TYPE,
    selectionToPartialJson
  } from '$lib/logic/selection'
  import { mapValidationErrors } from '$lib/logic/validation'
  import {
    activeElementIsChildOf,
    findParentWithNodeName,
    getWindow,
    isChildOfNodeName,
    setCursorToEnd
  } from '$lib/utils/domUtils'
  import { parseJSONPointerWithArrayIndices } from '$lib/utils/jsonPointer.js'
  import { parsePartialJson, repairPartialJson } from '$lib/utils/jsonUtils'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'
  import { isObject, isObjectOrArray, isUrl } from '$lib/utils/typeUtils'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'
  import Message from '../../controls/Message.svelte'
  import ValidationErrorsOverview from '../../controls/ValidationErrorsOverview.svelte'
  import CopyPasteModal from '../../modals/CopyPasteModal.svelte'
  import JSONRepairModal from '../../modals/JSONRepairModal.svelte'
  import SortModal from '../../modals/SortModal.svelte'
  import TransformModal from '../../modals/TransformModal.svelte'
  import ContextMenu from './contextmenu/ContextMenu.svelte'
  import JSONNode from './JSONNode.svelte'
  import TreeMenu from './menu/TreeMenu.svelte'
  import Welcome from './Welcome.svelte'
  import NavigationBar from '../../../components/controls/navigationBar/NavigationBar.svelte'
  import SearchBox from '../../../components/modes/treemode/menu/SearchBox.svelte'

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
  export let validator = null
  export let visible = true
  export let indentation = 2
  export let onError
  export let onChange
  export let onRequestRepair = () => {}
  export let onRenderMenu = () => {}

  function noop() {}

  /** @type {function (path: Path, value: *) : string} */
  export let onClassName
  export let onFocus
  export let onBlur

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

  let json
  let text
  let state = syncState({}, undefined, [], defaultExpand)

  let selection = null

  let pastedJson

  function defaultExpand(path) {
    return path.length < 1 ? true : path.length === 1 && path[0] === 0 // first item of an array?
  }

  let showSearch = false
  let searching = false
  let searchText = ''
  let searchResult

  async function handleSearchText(text) {
    searchText = text
    await tick() // await for the search results to be updated
    await focusActiveSearchResult(searchResult && searchResult.activeItem)
  }

  async function handleNextSearchResult() {
    searchResult = searchResult ? searchNext(searchResult) : searchResult
    await focusActiveSearchResult(searchResult && searchResult.activeItem)
  }

  async function handlePreviousSearchResult() {
    searchResult = searchResult ? searchPrevious(searchResult) : searchResult
    await focusActiveSearchResult(searchResult && searchResult.activeItem)
  }

  function clearSearchResult() {
    showSearch = false
    handleSearchText('')
    focus()
  }

  async function focusActiveSearchResult(activeItem) {
    if (activeItem) {
      const path = activeItem.path
      state = expandPath(json, state, path)
      await tick()
      scrollTo(path)
    }
  }

  function applySearch() {
    if (searchText === '') {
      searchResult = undefined
      return
    }

    searching = true

    // setTimeout is to wait until the search icon has been rendered
    setTimeout(() => {
      debug('searching...', searchText)

      // console.time('search') // TODO: cleanup
      const flatResults = search(searchText, json, state, MAX_SEARCH_RESULTS)
      searchResult = updateSearchResult(json, flatResults, searchResult)
      // console.timeEnd('search') // TODO: cleanup

      searching = false
    })
  }

  const applySearchThrottled = throttle(applySearch, SEARCH_UPDATE_THROTTLE)

  // we pass non-used arguments searchText and json to trigger search when these variables change
  $: applySearchThrottled(searchText, json)

  /**
   * @param {ValidationError} error
   **/
  function handleSelectValidationError(error) {
    debug('select validation error', error)

    selection = createSelection(json, state, {
      type: SELECTION_TYPE.VALUE,
      path: error.path
    })
    scrollTo(error.path)
    focus()
  }

  const history = createHistory({
    onChange: (state) => {
      historyState = state
    }
  })
  let historyState = history.getState()

  export function expand(callback = () => true) {
    state = syncState(json, state, [], callback, true)
  }

  // two-way binding of externalContent and internal json and text (
  // when receiving an updated prop, we have to update state for example
  $: applyExternalContent(externalContent)

  let textIsRepaired = false
  $: textIsUnrepairable = text !== undefined && json === undefined

  // TODO: debounce JSON schema validation
  $: validationErrorsList = validator ? validator(json) : []
  $: validationErrors = mapValidationErrors(validationErrorsList)

  export function get() {
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

    debug('update', { isChanged, isText })

    if (!isChanged) {
      // no actual change, don't do anything
      return
    }

    const prevState = state
    const prevJson = json
    const prevText = text
    const prevTextIsRepaired = textIsRepaired
    const prevSelection = selection

    json = updatedJson
    state = syncState(json, prevState, [], defaultExpand)
    text = undefined
    textIsRepaired = false
    selection = clearSelectionWhenNotExisting(selection, json)

    addHistoryItem({ prevJson, prevState, prevText, prevTextIsRepaired, prevSelection })
  }

  function applyExternalText(updatedText) {
    if (updatedText === undefined || externalContent.json !== undefined) {
      return
    }

    if (updatedText === text) {
      // no actual change, don't do anything
      return
    }

    const prevJson = json
    const prevState = state
    const prevText = text
    const prevTextIsRepaired = textIsRepaired
    const prevSelection = selection

    try {
      json = JSON.parse(updatedText)
      state = syncState(json, prevState, [], defaultExpand)
      text = updatedText
      textIsRepaired = false
      selection = clearSelectionWhenNotExisting(selection, json)
    } catch (err) {
      try {
        json = JSON.parse(jsonrepair(updatedText))
        state = syncState(json, prevState, [], defaultExpand)
        text = updatedText
        textIsRepaired = true
        selection = clearSelectionWhenNotExisting(selection, json)
      } catch (err) {
        // no valid JSON, will show empty document or invalid json
        json = undefined
        state = createState(json)
        text = externalContent.text
        textIsRepaired = false
        selection = clearSelectionWhenNotExisting(selection, json)
      }
    }

    if (!selection && (text === '' || text === undefined)) {
      // make sure there is a selection,
      // else we cannot paste or insert in case of an empty document
      selection = createDefaultSelection()
    }

    addHistoryItem({ prevJson, prevState, prevText, prevTextIsRepaired, prevSelection })
  }

  function clearSelectionWhenNotExisting(selection, json) {
    if (selection && existsIn(json, selection.anchorPath) && existsIn(json, selection.focusPath)) {
      return selection
    }

    debug('clearing selection: path does not exist anymore')
    return null
  }

  function addHistoryItem({ prevJson, prevState, prevText, prevTextIsRepaired, prevSelection }) {
    if (prevJson === undefined && prevText === undefined) {
      // initialization -> do not create a history item
      return
    }

    if (json !== undefined) {
      if (prevJson !== undefined) {
        // regular undo/redo with JSON patch
        history.add({
          undo: {
            patch: [{ op: 'replace', path: '', value: prevJson }],
            state: prevState,
            text: prevText,
            textIsRepaired: prevTextIsRepaired,
            selection: removeEditModeFromSelection(prevSelection)
          },
          redo: {
            patch: [{ op: 'replace', path: '', value: json }],
            state,
            text,
            textIsRepaired,
            selection: removeEditModeFromSelection(selection)
          }
        })
      } else {
        history.add({
          undo: {
            state: prevState,
            text: prevText,
            textIsRepaired: prevTextIsRepaired,
            selection: removeEditModeFromSelection(prevSelection)
          },
          redo: {
            json,
            state,
            text,
            textIsRepaired,
            selection: removeEditModeFromSelection(selection)
          }
        })
      }
    } else {
      if (prevJson !== undefined) {
        history.add({
          undo: {
            json: prevJson,
            state: prevState,
            text: prevText,
            textIsRepaired: prevTextIsRepaired,
            selection: removeEditModeFromSelection(prevSelection)
          },
          redo: {
            text,
            textIsRepaired,
            state,
            selection: removeEditModeFromSelection(selection)
          }
        })
      } else {
        // this cannot happen. Nothing to do, no change
      }
    }
  }

  function createDefaultSelection() {
    return createSelection(json || {}, state, {
      type: SELECTION_TYPE.MULTI,
      anchorPath: [],
      focusPath: []
    })
  }

  /**
   * @param {JSONPatchDocument} operations
   * @param {Selection | (json: JSON, state: JSON) => Selection} [newSelection]
   */
  export function patch(operations, newSelection) {
    if (json === undefined) {
      throw new Error('Cannot apply patch: no JSON')
    }

    const prevState = state
    const prevText = text
    const prevTextIsRepaired = textIsRepaired
    const prevSelection = selection

    debug('patch', operations, newSelection)

    const undo = revertJSONPatch(json, operations)
    const update = documentStatePatch(json, state, operations)

    json = update.json
    state = update.state
    text = undefined
    textIsRepaired = false

    if (typeof newSelection === 'function') {
      selection = newSelection(json, state)
    } else if (newSelection) {
      selection = newSelection
    }
    selection = clearSelectionWhenNotExisting(selection, json)

    history.add({
      undo: {
        patch: undo,
        state: prevState,
        text: prevText,
        textIsRepaired: prevTextIsRepaired,
        selection: removeEditModeFromSelection(prevSelection)
      },
      redo: {
        patch: operations,
        state,
        text,
        textIsRepaired,
        selection: removeEditModeFromSelection(selection)
      }
    })

    return {
      json,
      undo,
      redo: operations
    }
  }

  // TODO: cleanup logging
  // $: debug('json', json)
  // $: debug('state', state)
  // $: debug('selection', selection)

  function hasSelectionContents() {
    return (
      selection &&
      (selection.type === SELECTION_TYPE.MULTI ||
        selection.type === SELECTION_TYPE.KEY ||
        selection.type === SELECTION_TYPE.VALUE)
    )
  }

  function handleEditKey() {
    if (readOnly || !selection) {
      return
    }

    selection = createSelection(json, state, {
      type: SELECTION_TYPE.KEY,
      path: selection.focusPath,
      edit: true
    })
  }

  function handleEditValue() {
    if (readOnly || !selection) {
      return
    }

    selection = createSelection(json, state, {
      type: SELECTION_TYPE.VALUE,
      path: selection.focusPath,
      edit: true
    })
  }

  function handleApplyAutoRepair() {
    if (json !== undefined) {
      handleChangeJson(json)
    }
  }

  async function handleCut(indent = true) {
    if (readOnly || !hasSelectionContents()) {
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

    const { operations, newSelection } = createRemoveOperations(json, state, selection)
    handlePatch(operations, newSelection)
  }

  async function handleCopy(indent = true) {
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

    if (readOnly || !selection) {
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
          ...SIMPLE_MODAL_OPTIONS.styleWindow,
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
      const operations = insert(json, state, selection, clipboardText)

      debug('paste', { clipboardText, operations, selection })

      handlePatch(operations)

      // expand newly inserted object/array
      operations
        .filter((operation) => isObjectOrArray(operation.value))
        .forEach(async (operation) => {
          const path = parseJSONPointerWithArrayIndices(json, operation.path)
          handleExpand(path, true, false)
        })
    } else {
      debug('paste', { clipboardText })

      handleChangeText(clipboardText)
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
          ...SIMPLE_MODAL_OPTIONS.styleWindow,
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
    if (readOnly || !selection) {
      return
    }

    // in case of a selected key or value, we change the selection to the whole
    // entry to remove this, we do not want to clear a key or value only.
    const removeSelection =
      selection.type === SELECTION_TYPE.KEY || selection.type === SELECTION_TYPE.VALUE
        ? createSelection(json, state, {
            type: SELECTION_TYPE.MULTI,
            anchorPath: selection.anchorPath,
            focusPath: selection.focusPath
          })
        : selection

    if (isEmpty(selection.focusPath)) {
      // root selected -> clear complete document
      debug('remove', { selection })

      onChange({
        text: '',
        json: undefined
      })
    } else {
      // remove selection
      const { operations, newSelection } = createRemoveOperations(json, state, removeSelection)

      debug('remove', { operations, selection, newSelection })

      handlePatch(operations, newSelection)
    }
  }

  function handleDuplicate() {
    if (
      readOnly ||
      !hasSelectionContents() ||
      isEmpty(selection.focusPath) // root selected, cannot duplicate
    ) {
      return
    }

    debug('duplicate', { selection })

    const operations = duplicate(json, state, selection.paths || [selection.focusPath])

    handlePatch(operations)
  }

  function handleExtract() {
    if (
      readOnly ||
      !selection ||
      (selection.type !== SELECTION_TYPE.MULTI && selection.type !== SELECTION_TYPE.VALUE) ||
      isEmpty(selection.focusPath) // root selected, cannot extract
    ) {
      return
    }

    debug('extract', { selection })

    const operations = extract(json, state, selection)

    handlePatch(operations)

    if (isObjectOrArray(json)) {
      // expand extracted object/array
      handleExpand([], true, false)

      focus() // TODO: find a more robust way to keep focus than sprinkling focus() everywhere
    }
  }

  /**
   * @param {'value' | 'object' | 'array' | 'structure'} type
   */
  function handleInsert(type) {
    if (readOnly || !selection) {
      return
    }

    const newValue = createNewValue(json, selection, type)

    if (json !== undefined) {
      const data = JSON.stringify(newValue)
      const operations = insert(json, state, selection, data)
      debug('handleInsert', { type, operations, newValue, data })

      const operation = last(
        operations.filter((operation) => operation.op === 'add' || operation.op === 'replace')
      )

      handlePatch(operations, (patchedJson, patchedState) => {
        // TODO: extract determining the newSelection in a separate function
        if (operation) {
          const path = parseJSONPointerWithArrayIndices(patchedJson, operation.path)

          if (isObjectOrArray(newValue)) {
            handleExpand(path, true)

            return createSelection(patchedJson || {}, patchedState, {
              type: SELECTION_TYPE.INSIDE,
              path
            })
          }

          if (newValue === '') {
            // open the newly inserted value in edit mode
            const parent = !isEmpty(path) ? getIn(patchedJson, initial(path)) : null

            return createSelection(patchedJson, patchedState, {
              type: isObject(parent) ? SELECTION_TYPE.KEY : SELECTION_TYPE.VALUE,
              path,
              edit: true
            })
          }

          return undefined
        }
      })

      if (operation) {
        focus() // TODO: find a more robust way to keep focus than sprinkling focus() everywhere

        if (newValue === '') {
          // open the newly inserted value in edit mode
          tick().then(() => {
            setTimeout(() => replaceActiveElementContents(''))
          })
        }
      }
    } else {
      // document is empty or invalid (in that case it has text but no json)
      debug('handleInsert', { type, newValue })

      handleChangeJson(newValue)

      const path = []
      handleExpand(path, true)

      selection = createSelection(json, state, {
        type: SELECTION_TYPE.INSIDE,
        path
      })

      focus() // TODO: find a more robust way to keep focus than sprinkling focus() everywhere
    }
  }

  /**
   * @param {'value' | 'object' | 'array' | 'structure'} type
   */
  function handleInsertFromContextMenu(type) {
    if (selection.type === SELECTION_TYPE.KEY) {
      // in this case, we do not want to rename the key, but replace the property
      selection = createSelection(json, state, {
        type: SELECTION_TYPE.VALUE,
        path: selection.focusPath
      })
    }

    handleInsert(type)
  }

  function handleInsertBefore() {
    const selectionBefore = getSelectionUp(json, state, selection, false)
    const parentPath = initial(selection.focusPath)

    if (
      !isEmpty(selectionBefore.focusPath) &&
      isEqual(parentPath, initial(selectionBefore.focusPath))
    ) {
      selection = createSelection(json, state, {
        type: SELECTION_TYPE.AFTER,
        path: selectionBefore.focusPath
      })
    } else {
      selection = createSelection(json, state, {
        type: SELECTION_TYPE.INSIDE,
        path: parentPath
      })
    }

    debug('insert before', { selection, selectionBefore, parentPath })

    tick().then(handleContextMenu)
  }

  function handleInsertAfter() {
    const path = selection.paths ? last(selection.paths) : selection.focusPath

    debug('insert after', path)

    selection = createSelection(json, state, {
      type: SELECTION_TYPE.AFTER,
      path
    })

    tick().then(handleContextMenu)
  }

  function replaceActiveElementContents(char) {
    const activeElement = getWindow(refJsonEditor).document.activeElement
    if (activeElement.isContentEditable) {
      activeElement.textContent = char
      setCursorToEnd(activeElement)
      // FIXME: should trigger an oninput, else the component will not update it's newKey/newValue variable
    }
  }

  async function handleInsertCharacter(char) {
    // a regular key like a, A, _, etc is entered.
    // Replace selected contents with a new value having this first character as text
    if (readOnly || !selection) {
      return
    }

    if (selection.type === SELECTION_TYPE.KEY) {
      selection = { ...selection, edit: true }
      await tick()
      setTimeout(() => replaceActiveElementContents(char))
      return
    }

    if (char === '{') {
      handleInsert('object')
    } else if (char === '[') {
      handleInsert('array')
    } else {
      if (selection.type === SELECTION_TYPE.VALUE) {
        if (!isObjectOrArray(getIn(json, selection.focusPath))) {
          selection = { ...selection, edit: true }
          await tick()
          setTimeout(() => replaceActiveElementContents(char))
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
    if (readOnly || !selection) {
      return
    }

    // first insert a new value
    handleInsert('value')

    // next, open the new value in edit mode and apply the current character
    const path = selection.focusPath
    const parent = getIn(json, initial(path))
    selection = createSelection(json, state, {
      type:
        Array.isArray(parent) || selection.type === SELECTION_TYPE.VALUE
          ? SELECTION_TYPE.VALUE
          : SELECTION_TYPE.KEY,
      path,
      edit: true
    })

    await tick()
    setTimeout(() => replaceActiveElementContents(char))
  }

  function handleUndo() {
    if (!history.getState().canUndo) {
      return
    }

    const item = history.undo()
    if (!item) {
      return
    }

    selection = item.undo.selection
    json = item.undo.patch ? immutableJSONPatch(json, item.undo.patch) : item.undo.json
    state = item.undo.state
    text = item.undo.text
    textIsRepaired = item.undo.textIsRepaired

    debug('undo', { item, json, state, selection })

    emitOnChange()

    focus()
  }

  function handleRedo() {
    if (!history.getState().canRedo) {
      return
    }

    const item = history.redo()
    if (!item) {
      return
    }

    selection = item.redo.selection
    json = item.redo.patch ? immutableJSONPatch(json, item.redo.patch) : item.redo.json
    state = item.redo.state
    text = item.redo.text
    textIsRepaired = item.redo.textIsRepaired

    debug('redo', { item, json, state, selection })

    emitOnChange()

    focus()
  }

  function openSortModal(selectedPath) {
    if (readOnly) {
      return
    }

    modalOpen = true

    open(
      SortModal,
      {
        id: sortModalId,
        json: json,
        selectedPath,
        onSort: async (operations) => {
          debug('onSort', selectedPath, operations)

          const newSelection = createSelection(json, state, {
            type: SELECTION_TYPE.VALUE,
            path: selectedPath
          })
          handlePatch(operations, newSelection)

          // expand the newly replaced array
          handleExpand(selectedPath, true)
          // FIXME: because we apply expand *after* the patch, when doing undo/redo, the expanded state is not restored
        }
      },
      SORT_MODAL_OPTIONS,
      {
        onClose: () => {
          modalOpen = false
          focus()
        }
      }
    )
  }

  function handleSortSelection() {
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

  export function openTransformModal({ id, selectedPath, onTransform, onClose }) {
    if (readOnly) {
      return
    }

    modalOpen = true

    open(
      TransformModal,
      {
        id: id || transformModalId,
        json: json,
        selectedPath,
        indentation,
        onTransform: onTransform
          ? (operations) => {
              onTransform({
                operations,
                json,
                transformedJson: immutableJSONPatch(json, operations)
              })
            }
          : async (operations) => {
              debug('onTransform', selectedPath, operations)

              const newSelection = createSelection(json, state, {
                type: SELECTION_TYPE.VALUE,
                path: selectedPath
              })
              handlePatch(operations, newSelection)

              // expand the newly replaced array
              handleExpand(selectedPath, true)
              // FIXME: because we apply expand *after* the patch, when doing undo/redo, the expanded state is not restored
            }
      },
      TRANSFORM_MODAL_OPTIONS,
      {
        onClose: () => {
          modalOpen = false
          focus()
          if (onClose) {
            onClose()
          }
        }
      }
    )
  }

  function handleTransformSelection() {
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
   * @param {Path} path
   */
  export async function scrollTo(path) {
    state = expandPath(json, state, path)
    await tick()

    const elem = findElement(path)
    const offset = -(refContents.getBoundingClientRect().height / 4)

    if (elem) {
      debug('scrollTo', { path, elem, refContents })
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
  export function findElement(path) {
    return refContents.querySelector(`div[data-path="${compileJSONPointer(path)}"]`)
  }

  /**
   * If given path is outside of the visible viewport, scroll up/down.
   * When the path is already in view, nothing is done
   * @param {Path} path
   */
  function scrollIntoView(path) {
    const elem = refContents.querySelector(`div[data-path="${compileJSONPointer(path)}"]`)

    if (elem) {
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
  }

  function emitOnChange() {
    if (text !== undefined) {
      onChange({
        text,
        json: undefined
      })
    } else if (json !== undefined) {
      onChange({
        text: undefined,
        json
      })
    }
  }

  /**
   * @param {JSONPatchDocument} operations
   * @param {Selection} [newSelection] If no new selection is provided,
   *                                   The new selection will be determined
   *                                   based on the operations.
   */
  function handlePatch(operations, newSelection = createSelectionFromOperations(json, operations)) {
    if (readOnly) {
      return
    }

    debug('handlePatch', operations, newSelection)

    const patchResult = patch(operations, newSelection)

    pastedJson = undefined

    emitOnChange()

    return patchResult
  }

  function handleChangeJson(updatedJson) {
    const prevState = state
    const prevJson = json
    const prevText = text
    const prevTextIsRepaired = textIsRepaired
    const prevSelection = selection

    json = updatedJson
    state = syncState(json, prevState, [], defaultExpand)
    text = undefined
    textIsRepaired = false
    selection = clearSelectionWhenNotExisting(selection, json)

    addHistoryItem({ prevJson, prevState, prevText, prevTextIsRepaired, prevSelection })

    emitOnChange()
  }

  function handleChangeText(updatedText) {
    const prevState = state
    const prevJson = json
    const prevText = text
    const prevTextIsRepaired = textIsRepaired
    const prevSelection = selection

    try {
      json = JSON.parse(updatedText)
      state = syncState(json, prevState, [], defaultExpand)
      text = updatedText
      textIsRepaired = false
      selection = clearSelectionWhenNotExisting(selection, json)
    } catch (err) {
      try {
        json = JSON.parse(jsonrepair(updatedText))
        state = syncState(json, prevState, [], defaultExpand)
        text = updatedText
        textIsRepaired = true
        selection = clearSelectionWhenNotExisting(selection, json)
      } catch (err) {
        // no valid JSON, will show empty document or invalid json
        json = undefined
        state = createState(json)
        text = updatedText
        textIsRepaired = false
        selection = clearSelectionWhenNotExisting(selection, json)
      }
    }

    addHistoryItem({ prevJson, prevState, prevText, prevTextIsRepaired, prevSelection })

    emitOnChange()
  }

  /**
   * Toggle expanded state of a node
   * @param {Path} path
   * @param {boolean} expanded  True to expand, false to collapse
   * @param {boolean} [recursive=false]  Only applicable when expanding
   */
  function handleExpand(path, expanded, recursive = false) {
    // TODO: move this function into documentState.js
    if (recursive) {
      state = updateIn(state, path, (childState) => {
        return syncState(getIn(json, path), childState, [], () => expanded, true)
      })
    } else {
      state = setIn(state, path.concat(STATE_EXPANDED), expanded, true)

      state = updateIn(state, path, (childState) => {
        return syncState(getIn(json, path), childState, [], defaultExpand, false)
      })
    }

    if (selection && !expanded) {
      // check whether the selection is still visible and not collapsed
      if (isSelectionInsidePath(selection, path)) {
        // remove selection when not visible anymore
        selection = null
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

  /**
   * @param {SelectionSchema} selectionSchema
   */
  function handleSelect(selectionSchema) {
    if (selectionSchema) {
      selection = createSelection(json, state, selectionSchema)
    } else {
      selection = null
    }

    // set focus to the hidden input, so we can capture quick keys like Ctrl+X, Ctrl+C, Ctrl+V
    // we do this after a setTimeout in case the selection was made by clicking a button
    setTimeout(() => focus())
  }

  function handleExpandSection(path, section) {
    debug('handleExpandSection', path, section)

    state = expandSection(json, state, path, section)
  }

  function handlePasteJson(newPastedJson) {
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
      selection = selectAll()
    }

    if (combo === 'Ctrl+Q') {
      handleContextMenu(event)
    }

    if (combo === 'Up' || combo === 'Shift+Up') {
      event.preventDefault()
      selection = selection
        ? getSelectionUp(json, state, selection, keepAnchorPath, true) || selection
        : getInitialSelection(json, state)

      scrollIntoView(selection.focusPath)
    }
    if (combo === 'Down' || combo === 'Shift+Down') {
      event.preventDefault()
      selection = selection
        ? getSelectionDown(json, state, selection, keepAnchorPath, true) || selection
        : getInitialSelection(json, state)

      scrollIntoView(selection.focusPath)
    }
    if (combo === 'Left' || combo === 'Shift+Left') {
      event.preventDefault()
      selection = selection
        ? getSelectionLeft(json, state, selection, keepAnchorPath, !readOnly) || selection
        : getInitialSelection(json, state)

      scrollIntoView(selection.focusPath)
    }
    if (combo === 'Right' || combo === 'Shift+Right') {
      event.preventDefault()
      selection = selection
        ? getSelectionRight(json, state, selection, keepAnchorPath, !readOnly) || selection
        : getInitialSelection(json, state)

      scrollIntoView(selection.focusPath)
    }

    if (combo === 'Enter' && selection) {
      // when the selection consists of a single Array item, change selection to editing its value
      if (!readOnly && selection.type === SELECTION_TYPE.MULTI && selection.paths.length === 1) {
        const path = selection.focusPath
        const parent = getIn(json, initial(path))
        if (Array.isArray(parent)) {
          // change into selection of the value
          selection = createSelection(json, state, {
            type: SELECTION_TYPE.VALUE,
            path
          })
        }
      }

      if (!readOnly && selection.type === SELECTION_TYPE.KEY) {
        // go to key edit mode
        event.preventDefault()
        selection = {
          ...selection,
          edit: true
        }
      }

      if (selection.type === SELECTION_TYPE.VALUE) {
        event.preventDefault()

        const value = getIn(json, selection.focusPath)
        if (isObjectOrArray(value)) {
          // expand object/array
          handleExpand(selection.focusPath, true)
        } else {
          if (!readOnly) {
            // go to value edit mode
            selection = {
              ...selection,
              edit: true
            }
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

    if (
      combo === 'Enter' &&
      (selection.type === SELECTION_TYPE.AFTER || selection.type === SELECTION_TYPE.INSIDE)
    ) {
      // Enter on an insert area -> open the area in edit mode
      event.preventDefault()
      handleInsertCharacter('')
      return
    }

    if (combo === 'Ctrl+Enter' && selection && selection.type === SELECTION_TYPE.VALUE) {
      const value = getIn(json, selection.focusPath)

      if (isUrl(value)) {
        // open url in new page
        window.open(value, '_blank')
      }
    }

    if (combo === 'Escape' && selection) {
      event.preventDefault()
      selection = null
    }

    if (combo === 'Ctrl+F') {
      event.preventDefault()
      showSearch = true
    }

    if (combo === 'Ctrl+Z') {
      event.preventDefault()

      // TODO: find a better way to restore focus
      const activeElement = document.activeElement
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
      const activeElement = document.activeElement
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

          if (!selection) {
            selection = createDefaultSelection()
          }
        }
      })
    })
  }

  function openContextMenu({ anchor, left, top, width, height, offsetTop, offsetLeft }) {
    const props = {
      json,
      selection,

      onEditKey: handleEditKey,
      onEditValue: handleEditValue,

      onCut: handleCut,
      onCopy: handleCopy,
      onPaste: handlePasteFromMenu,

      onRemove: handleRemove,
      onDuplicate: handleDuplicate,
      onExtract: handleExtract,

      onInsertBefore: handleInsertBefore,
      onInsert: handleInsertFromContextMenu,
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
    if (readOnly) {
      return
    }

    if (!selection || selection.edit) {
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
        height: CONTEXT_MENU_HEIGHT
      })
    } else {
      // type === 'keydown' (from the quick key Ctrl+Q)
      // or target is hidden input -> context menu button on keyboard
      const anchor = refContents.querySelector('.context-menu-button.selected')
      if (anchor) {
        openContextMenu({
          anchor,
          offsetTop: 2,
          width: CONTEXT_MENU_WIDTH,
          height: CONTEXT_MENU_HEIGHT
        })
      } else {
        // fallback on just displaying the ContextMenu top left
        const rect = refContents.getBoundingClientRect()
        openContextMenu({
          top: rect.top + 2,
          left: rect.left + 2,
          width: CONTEXT_MENU_WIDTH,
          height: CONTEXT_MENU_HEIGHT
        })
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
      height: CONTEXT_MENU_HEIGHT
    })
  }

  async function handleParsePastedJson() {
    const { path, contents } = pastedJson

    // exit edit mode
    selection = createSelection(json, state, {
      type: SELECTION_TYPE.VALUE,
      path
    })

    await tick()

    // replace the value with the JSON object/array
    handlePatch([
      {
        op: 'replace',
        path: compileJSONPointer(path),
        value: contents
      }
    ])

    handleExpand(path, true)
  }

  function handleClearPastedJson() {
    pastedJson = undefined
  }

  function handleNavigationBarSelect(newSelection) {
    selection = newSelection

    focus()
    scrollTo(newSelection.focusPath)
  }

  export function focus() {
    // with just .focus(), sometimes the input doesn't react on onpaste events
    // in Chrome when having a large document open and then doing cut/paste.
    // Calling both .focus() and .select() did solve this issue.
    refHiddenInput.focus()
    refHiddenInput.select()
  }

  $: autoScrollHandler = createAutoScrollHandler(refContents)
</script>

<div
  class="tree-mode"
  class:visible
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
    <NavigationBar {json} {state} {selection} onSelect={handleNavigationBarSelect} />
  {/if}

  {#if !isSSR}
    <label class="hidden-input-label">
      <input class="hidden-input" tabindex="-1" bind:this={refHiddenInput} on:paste={handlePaste} />
    </label>
    {#if json === undefined}
      {#if text === '' || text === undefined}
        <Welcome />
      {:else}
        <Message
          type="error"
          message="The loaded JSON document is invalid and could not be repaired automatically."
          actions={[
            {
              icon: faCode,
              text: 'Repair manually',
              onClick: onRequestRepair
            }
          ]}
        />
        <div class="preview">
          {text}
        </div>
      {/if}
    {:else}
      {#if showSearch}
        <div class="search-box-container" class:navigation-bar-offset={navigationBar}>
          <SearchBox
            text={searchText}
            resultCount={searchResult ? searchResult.count : 0}
            activeIndex={searchResult ? searchResult.activeIndex : 0}
            {searching}
            onChange={handleSearchText}
            onNext={handleNextSearchResult}
            onPrevious={handlePreviousSearchResult}
            onClose={clearSearchResult}
          />
        </div>
      {/if}
      <div class="contents" data-jsoneditor-scrollable-contents={true} bind:this={refContents}>
        <JSONNode
          value={json}
          path={[]}
          {state}
          {readOnly}
          searchResult={searchResult && searchResult.itemsWithActive}
          {validationErrors}
          onPatch={handlePatch}
          onInsert={handleInsert}
          onExpand={handleExpand}
          onSelect={handleSelect}
          onPasteJson={handlePasteJson}
          onExpandSection={handleExpandSection}
          onContextMenu={openContextMenu}
          onClassName={onClassName || noop}
          onDrag={autoScrollHandler.onDrag}
          onDragEnd={autoScrollHandler.onDragEnd}
          {selection}
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
              onClick: handleParsePastedJson
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
          actions={[
            {
              icon: faCheck,
              text: 'Ok',
              onClick: handleApplyAutoRepair
            },
            {
              icon: faCode,
              text: 'Repair manually instead',
              onClick: onRequestRepair
            }
          ]}
        />
      {/if}

      <ValidationErrorsOverview {validationErrorsList} selectError={handleSelectValidationError} />
    {/if}
  {:else}
    <div class="contents">
      <div class="loading-space" />
      <div class="loading">loading...</div>
    </div>
  {/if}
</div>

<style src="./TreeMode.scss"></style>
