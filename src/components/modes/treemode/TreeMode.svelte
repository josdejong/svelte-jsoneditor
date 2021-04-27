<svelte:options immutable={true} />

<script>
  import { faCheck, faCode } from '@fortawesome/free-solid-svg-icons'
  import createDebug from 'debug'
  import {
    compileJSONPointer,
    getIn,
    immutableJSONPatch,
    revertJSONPatch,
    setIn,
    updateIn
  } from 'immutable-json-patch'
  import jsonrepair from 'jsonrepair'
  import {
    initial,
    isEmpty,
    isEqual,
    last,
    throttle,
    uniqueId
  } from 'lodash-es'
  import { getContext, onDestroy, onMount, tick } from 'svelte'
  import { createJump } from '../../../assets/jump.js/src/jump.js'
  import {
    CONTEXT_MENU_HEIGHT,
    CONTEXT_MENU_WIDTH,
    MAX_SEARCH_RESULTS,
    SCROLL_DURATION,
    SEARCH_PROGRESS_THROTTLE,
    SIMPLE_MODAL_OPTIONS,
    SORT_MODAL_OPTIONS,
    STATE_EXPANDED,
    TRANSFORM_MODAL_OPTIONS
  } from '../../../constants.js'
  import {
    documentStatePatch,
    expandPath,
    expandSection,
    syncState
  } from '../../../logic/documentState.js'
  import { createHistory } from '../../../logic/history.js'
  import {
    createNewValue,
    createRemoveOperations,
    duplicate,
    extract,
    insert
  } from '../../../logic/operations.js'
  import {
    searchAsync,
    searchNext,
    searchPrevious,
    updateSearchResult
  } from '../../../logic/search.js'
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
  } from '../../../logic/selection.js'
  import { mapValidationErrors } from '../../../logic/validation.js'
  import {
    activeElementIsChildOf,
    getWindow,
    isChildOfNodeName,
    setCursorToEnd
  } from '../../../utils/domUtils.js'
  import { parseJSONPointerWithArrayIndices } from '../../../utils/jsonPointer.js'
  import {
    parsePartialJson,
    repairPartialJson
  } from '../../../utils/jsonUtils.js'
  import { keyComboFromEvent } from '../../../utils/keyBindings.js'
  import { isObject, isObjectOrArray, isUrl } from '../../../utils/typeUtils.js'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'
  import Message from '../../controls/Message.svelte'
  import CopyPasteModal from '../../modals/CopyPasteModal.svelte'
  import JSONRepairModal from '../../modals/JSONRepairModal.svelte'
  import SortModal from '../../modals/SortModal.svelte'
  import TransformModal from '../../modals/TransformModal.svelte'
  import ContextMenu from './contextmenu/ContextMenu.svelte'
  import JSONNode from './JSONNode.svelte'
  import TreeMenu from './menu/TreeMenu.svelte'

  const debug = createDebug('jsoneditor:TreeMode')

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
  export let externalJson
  export let externalText
  export let mainMenuBar = true
  export let validator = null
  export let visible = true
  export let indentation = 2
  export let onError
  export let onChange
  export let onRequestRepair = () => {
  }
  export let onRenderMenu = () => {
  }

  function noop () {
  }

  /** @type {function (path: Path, value: *) : string} */
  export let onClassName
  export let onFocus
  export let onBlur

  createFocusTracker({
    onMount,
    onDestroy,
    getWindow: () => getWindow(refJsonEditor),
    hasFocus: () => activeElementIsChildOf(refJsonEditor),
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

  let json = externalJson
  let state = syncState(json, undefined, [], defaultExpand)

  let selection = null

  function defaultExpand (path) {
    return path.length < 1
      ? true
      : (path.length === 1 && path[0] === 0) // first item of an array?
  }

  $: validationErrorsList = validator ? validator(json) : []
  $: validationErrors = mapValidationErrors(validationErrorsList)

  let showSearch = false
  let searching = false
  let searchText = ''
  let searchResult
  let searchHandler

  function handleSearchProgress (results) {
    searchResult = updateSearchResult(json, results, searchResult)
  }

  const handleSearchProgressDebounced = throttle(handleSearchProgress, SEARCH_PROGRESS_THROTTLE)

  function handleSearchDone (results) {
    searchResult = updateSearchResult(json, results, searchResult)
    searching = false
    // debug('finished search')
  }

  async function handleSearchText (text) {
    searchText = text
    await tick() // await for the search results to be updated
    await focusActiveSearchResult(searchResult && searchResult.activeItem)
  }

  async function handleNextSearchResult () {
    searchResult = searchNext(searchResult)
    await focusActiveSearchResult(searchResult && searchResult.activeItem)
  }

  async function handlePreviousSearchResult () {
    searchResult = searchPrevious(searchResult)
    await focusActiveSearchResult(searchResult && searchResult.activeItem)
  }

  async function focusActiveSearchResult (activeItem) {
    if (activeItem) {
      const path = initial(activeItem)
      state = expandPath(json, state, path)
      await tick()
      scrollTo(path)
    }
  }

  $: {
    // cancel previous search when still running
    if (searchHandler && searchHandler.cancel) {
      // debug('cancel previous search')
      searchHandler.cancel()
    }

    // debug('start search', searchText)
    searching = true

    searchHandler = searchAsync(searchText, json, state, {
      onProgress: handleSearchProgressDebounced,
      onDone: handleSearchDone,
      maxResults: MAX_SEARCH_RESULTS
    })
  }

  const history = createHistory({
    onChange: (state) => {
      historyState = state
    }
  })
  let historyState = history.getState()

  export function expand (callback = () => true) {
    state = syncState(json, state, [], callback, true)
  }

  export function collapse (callback = () => false) {
    state = syncState(json, state, [], callback, true)
  }

  // two-way binding of externalJson and json (internal)
  // when receiving an updated prop, we have to update state.
  // when changing json in the editor, the bound external property must be updated
  $: applyExternalJson(externalJson)

  $: applyExternalText(externalText)

  let textIsRepaired = false
  $: textIsUnrepairable = (externalText !== undefined && json === undefined)

  export function get () {
    return json
  }

  function applyExternalJson (updatedJson) {
    if (updatedJson === undefined) {
      return
    }

    // TODO: this is inefficient. Make an optional flag promising that the updates are immutable so we don't have to do a deep equality check? First do some profiling!
    const isChanged = !isEqual(json, updatedJson)
    const isNew = json === undefined

    debug('update', { isChanged, isNew })

    if (!isChanged) {
      // no actual change, don't do anything
      return
    }

    const prevState = isNew ? undefined : state
    const prevJson = json

    json = updatedJson
    state = syncState(json, prevState, [], defaultExpand)

    if (!isNew && prevState) {
      history.add({
        undo: [{ op: 'replace', path: '', value: prevJson }],
        redo: [{ op: 'replace', path: '', value: json }],
        prevState,
        state,
        prevSelection: removeEditModeFromSelection(selection),
        selection: removeEditModeFromSelection(selection)
      })
    }
  }

  function applyExternalText (text) {
    if (text === undefined || externalJson !== undefined) {
      return
    }

    textIsRepaired = false

    try {
      applyExternalJson(JSON.parse(text))
    } catch (err) {
      try {
        applyExternalJson(JSON.parse(jsonrepair(text)))
        textIsRepaired = true
      } catch (err) {
        json = undefined
      }
    }
  }

  /**
   * @param {JSONPatchDocument} operations
   * @param {Selection} [newSelection]
   */
  export function patch (operations, newSelection) {
    const prevState = state
    const prevSelection = selection

    debug('patch', operations, newSelection)

    const undo = revertJSONPatch(json, operations)
    const update = documentStatePatch(json, state, operations)
    json = update.json
    state = update.state

    if (newSelection) {
      selection = newSelection
    }

    history.add({
      undo,
      redo: operations,
      prevState,
      state,
      prevSelection: removeEditModeFromSelection(prevSelection),
      selection: removeEditModeFromSelection(newSelection || selection)
    })

    return {
      json,
      undo,
      redo: operations
    }
  }

  // TODO: cleanup logging
  $: debug('json', json)
  $: debug('state', state)
  $: debug('selection', selection)

  function hasSelectionContents () {
    return selection && (
      selection.type === SELECTION_TYPE.MULTI ||
      selection.type === SELECTION_TYPE.KEY ||
      selection.type === SELECTION_TYPE.VALUE
    )
  }

  function handleEditKey () {
    if (readOnly || !selection) {
      return
    }

    selection = createSelection(json, state, {
      type: SELECTION_TYPE.KEY,
      path: selection.focusPath,
      edit: true
    })
  }

  function handleEditValue () {
    if (readOnly || !selection) {
      return
    }

    selection = createSelection(json, state, {
      type: SELECTION_TYPE.VALUE,
      path: selection.focusPath,
      edit: true
    })
  }

  async function handleCut () {
    if (readOnly || !hasSelectionContents()) {
      return
    }

    const clipboard = selectionToPartialJson(json, selection, indentation)
    if (clipboard == null) {
      return
    }

    debug('cut', { selection, clipboard })

    try {
      await navigator.clipboard.writeText(clipboard)
    } catch (err) {
      onError(err)
    }

    const {
      operations,
      newSelection
    } = createRemoveOperations(json, state, selection)
    handlePatch(operations, newSelection)
  }

  async function handleCopy () {
    const clipboard = selectionToPartialJson(json, selection, indentation)
    if (clipboard == null) {
      return
    }

    debug('copy', { clipboard })

    try {
      await navigator.clipboard.writeText(clipboard)
    } catch (err) {
      onError(err)
    }
  }

  function handlePaste (event) {
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

  function handlePasteFromMenu () {
    open(CopyPasteModal, {}, {
      ...SIMPLE_MODAL_OPTIONS,
      styleWindow: {
        ...SIMPLE_MODAL_OPTIONS.styleWindow,
        width: '450px'
      }
    }, {
      onClose: () => setTimeout(onFocus)
    })
  }

  function doPaste (clipboardText) {
    const operations = insert(json, state, selection, clipboardText)

    debug('paste', { clipboardText, operations, selection })

    handlePatch(operations)

    // expand newly inserted object/array
    operations
      .filter(operation => isObjectOrArray(operation.value))
      .forEach(async operation => {
        const path = parseJSONPointerWithArrayIndices(json, operation.path)
        handleExpand(path, true, false)
      })
  }

  function openRepairModal (text, onApply) {
    open(JSONRepairModal, {
      text,
      onParse: parsePartialJson,
      onRepair: repairPartialJson,
      onApply,
      onRenderMenu,
      onFocus,
      onBlur
    }, {
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
    }, {
      onClose: () => focus()
    })
  }

  function handleRemove () {
    if (readOnly || !selection) {
      return
    }

    const {
      operations,
      newSelection
    } = createRemoveOperations(json, state, selection)

    debug('remove', { operations, selection, newSelection })

    handlePatch(operations, newSelection)
  }

  function handleDuplicate () {
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

  function handleExtract () {
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
      handleExpand([], true, true)
      focus() // TODO: find a more robust way to keep focus than sprinkling focusHiddenInput() everywhere
    }
  }

  /**
   * @param {'value' | 'object' | 'array' | 'structure'} type
   */
  function handleInsert (type) {
    if (readOnly || !selection) {
      return
    }

    const newValue = createNewValue(json, selection, type)
    const data = JSON.stringify(newValue)
    const operations = insert(json, state, selection, data)
    debug('handleInsert', { type, operations, newValue, data })

    handlePatch(operations)

    operations
      .filter(operation => (operation.op === 'add' || operation.op === 'replace'))
      .forEach(async operation => {
        const path = parseJSONPointerWithArrayIndices(json, operation.path)

        if (isObjectOrArray(newValue)) {
          // expand newly inserted object/array
          handleExpand(path, true, true)
          focus() // TODO: find a more robust way to keep focus than sprinkling focusHiddenInput() everywhere
        }

        if (newValue === '') {
          // open the newly inserted value in edit mode
          const parent = !isEmpty(path)
            ? getIn(json, initial(path))
            : null

          selection = createSelection(json, state, {
            type: isObject(parent) ? SELECTION_TYPE.KEY : SELECTION_TYPE.VALUE,
            path,
            edit: true
          })

          await tick()
          setTimeout(() => replaceActiveElementContents(''))
        }
      })
  }

  /**
   * @param {'value' | 'object' | 'array' | 'structure'} type
   */
  function handleInsertFromContextMenu (type) {
    if (selection.type === SELECTION_TYPE.KEY) {
      // in this case, we do not want to rename the key, but replace the property
      selection = createSelection(json, state, {
        type: SELECTION_TYPE.VALUE,
        path: selection.focusPath
      })
    }

    handleInsert(type)
  }

  function handleInsertBefore () {
    const selectionBefore = getSelectionUp(json, state, selection, false)

    debug('insert before', selection, selectionBefore)

    const parentPath = initial(selection.focusPath)
    if (isEqual(parentPath, initial(selectionBefore.focusPath))) {
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
  }

  function handleInsertAfter () {
    const path = selection.paths
      ? last(selection.paths)
      : selection.focusPath

    debug('insert after', path)

    selection = createSelection(json, state, {
      type: SELECTION_TYPE.AFTER,
      path
    })

    // TODO: it may be nice to also open the context menu
    //  (though it's not so easy to get the location of the context menu button)
  }

  function replaceActiveElementContents (char) {
    const activeElement = getWindow(refJsonEditor).document.activeElement
    if (activeElement.isContentEditable) {
      activeElement.textContent = char
      setCursorToEnd(activeElement)
      // FIXME: should trigger an oninput, else the component will not update it's newKey/newValue variable
    }
  }

  async function handleInsertCharacter (char) {
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

  async function handleInsertValueWithCharacter (char) {
    if (readOnly || !selection) {
      return
    }

    // first insert a new value
    handleInsert('value')

    // next, open the new value in edit mode and apply the current character
    const path = selection.focusPath
    const parent = getIn(json, initial(path))
    selection = createSelection(json, state, {
      type: (Array.isArray(parent) || selection.type === SELECTION_TYPE.VALUE)
        ? SELECTION_TYPE.VALUE
        : SELECTION_TYPE.KEY,
      path,
      edit: true
    })

    await tick()
    setTimeout(() => replaceActiveElementContents(char))
  }

  function handleUndo () {
    if (!history.getState().canUndo) {
      return
    }

    const item = history.undo()
    if (!item) {
      return
    }

    json = immutableJSONPatch(json, item.undo)
    state = item.prevState
    selection = item.prevSelection

    debug('undo', { item, json, state, selection })

    emitOnChange()

    focus()
  }

  function handleRedo () {
    if (!history.getState().canRedo) {
      return
    }

    const item = history.redo()
    if (!item) {
      return
    }

    json = immutableJSONPatch(json, item.redo)
    state = item.state
    selection = item.selection

    debug('redo', { item, json, state, selection })

    emitOnChange()

    focus()
  }

  function openSortModal (selectedPath) {
    if (readOnly) {
      return
    }

    open(SortModal, {
      id: sortModalId,
      json: json,
      selectedPath,
      onSort: async (operations) => {
        debug('onSort', selectedPath, operations)
        patch(operations, selection)

        // expand the newly replaced array
        handleExpand(selectedPath, true)
        // FIXME: because we apply expand *after* the patch, when doing undo/redo, the expanded state is not restored
      }
    }, SORT_MODAL_OPTIONS, {
      onClose: () => focus()
    })
  }

  function handleSortSelection () {
    if (!selection) {
      return
    }

    const selectedPath = findRootPath(json, selection)
    openSortModal(selectedPath)
  }

  function handleSortAll () {
    const selectedPath = []
    openSortModal(selectedPath)
  }

  function openTransformModal (selectedPath) {
    if (readOnly) {
      return
    }

    open(TransformModal, {
      id: transformModalId,
      json: json,
      selectedPath,
      indentation,
      onTransform: async (operations) => {
        debug('onTransform', selectedPath, operations)
        patch(operations, selection)

        // expand the newly replaced array
        handleExpand(selectedPath, true)
        // FIXME: because we apply expand *after* the patch, when doing undo/redo, the expanded state is not restored
      }
    }, TRANSFORM_MODAL_OPTIONS, {
      onClose: () => focus()
    })
  }

  function handleTransformSelection () {
    if (!selection) {
      return
    }

    const selectedPath = findRootPath(json, selection)
    openTransformModal(selectedPath)
  }

  function handleTransformAll () {
    const selectedPath = []
    openTransformModal(selectedPath)
  }

  /**
   * Scroll the window vertically to the node with given path
   * @param {Path} path
   */
  export async function scrollTo (path) {
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
  export function findElement (path) {
    return refContents.querySelector(`div[data-path="${compileJSONPointer(path)}"]`)
  }

  /**
   * If given path is outside of the visible viewport, scroll up/down.
   * When the path is already in view, nothing is done
   * @param {Path} path
   */
  function scrollIntoView (path) {
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

  function emitOnChange () {
    onChange(json)
  }

  /**
   * @param {JSONPatchDocument} operations
   * @param {Selection} [newSelection] If no new selection is provided,
   *                                   The new selection will be determined
   *                                   based on the operations.
   */
  function handlePatch (
    operations,
    newSelection = createSelectionFromOperations(json, operations)
  ) {
    if (readOnly) {
      return
    }

    debug('handlePatch', operations, newSelection)

    const patchResult = patch(operations, newSelection)

    emitOnChange()

    return patchResult
  }

  /**
   * Toggle expanded state of a node
   * @param {Path} path
   * @param {boolean} expanded  True to expand, false to collapse
   * @param {boolean} [recursive=false]  Only applicable when expanding
   */
  function handleExpand (path, expanded, recursive = false) {
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

  function handleExpandAll () {
    handleExpand([], true, true)
  }

  function handleCollapseAll () {
    handleExpand([], false, true)
  }

  /**
   * @param {SelectionSchema} selectionSchema
   */
  function handleSelect (selectionSchema) {
    if (selectionSchema) {
      selection = createSelection(json, state, selectionSchema)
    } else {
      selection = null
    }

    // set focus to the hidden input, so we can capture quick keys like Ctrl+X, Ctrl+C, Ctrl+V
    // we do this after a setTimeout in case the selection was made by clicking a button
    setTimeout(() => focus())
  }

  function handleExpandSection (path, section) {
    debug('handleExpandSection', path, section)

    state = expandSection(json, state, path, section)
  }

  function handleKeyDown (event) {
    // get key combo, and normalize key combo from Mac: replace "Command+X" with "Ctrl+X" etc
    const combo = keyComboFromEvent(event).replace(/^Command\+/, 'Ctrl+')
    const keepAnchorPath = event.shiftKey

    if (combo === 'Ctrl+X') {
      event.preventDefault()
      handleCut()
    }
    if (combo === 'Ctrl+C') {
      event.preventDefault()
      handleCopy()
    }
    // Ctrl+V (paste) is handled by the on:paste event

    if (combo === 'Ctrl+D') {
      event.preventDefault()
      handleDuplicate()
    }
    if (combo === 'Delete') {
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
        ? getSelectionUp(json, state, selection, keepAnchorPath) || selection
        : getInitialSelection(json, state)

      scrollIntoView(selection.focusPath)
    }
    if (combo === 'Down' || combo === 'Shift+Down') {
      event.preventDefault()
      selection = selection
        ? getSelectionDown(json, state, selection, keepAnchorPath) || selection
        : getInitialSelection(json, state)

      scrollIntoView(selection.focusPath)
    }
    if (combo === 'Left' || combo === 'Shift+Left') {
      event.preventDefault()
      selection = selection
        ? getSelectionLeft(json, state, selection, keepAnchorPath) || selection
        : getInitialSelection(json, state)
    }
    if (combo === 'Right' || combo === 'Shift+Right') {
      event.preventDefault()
      selection = selection
        ? getSelectionRight(json, state, selection, keepAnchorPath) || selection
        : getInitialSelection(json, state)
    }

    if (combo === 'Enter' && selection && !readOnly) {
      // when the selection consists of one Array item, change selection to editing its value
      // TODO: this is a bit hacky
      if (selection.type === SELECTION_TYPE.MULTI && selection.paths.length === 1) {
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

      if (selection.type === SELECTION_TYPE.KEY) {
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
          // go to value edit mode
          selection = {
            ...selection,
            edit: true
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

    if (combo === 'Enter' && (selection.type === SELECTION_TYPE.AFTER || selection.type === SELECTION_TYPE.INSIDE)) {
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

  function handleMouseDown (event) {
    console.log('handleMouseDown', event)

    // TODO: ugly to have to have two setTimeout here. Without it, hiddenInput will blur
    setTimeout(() => {
      setTimeout(() => {
        if (!hasFocus && !isChildOfNodeName(event.target, 'BUTTON')) {
          // for example when clicking on the empty area in the main menu
          focus()
        }
      })
    })
  }

  function openContextMenu ({ anchor, left, top, width, height }) {
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

    openAbsolutePopup(ContextMenu, props, {
      left,
      top,
      width,
      height,
      anchor,
      closeOnOuterClick: true,
      onClose: focus
    })
  }

  function handleContextMenu (event) {
    if (!selection || selection.edit) {
      return
    }

    event.stopPropagation()
    event.preventDefault()

    if (event.type === 'contextmenu' && event.target !== refHiddenInput) {
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

  function handleContextMenuFromTreeMenu (event) {
    openContextMenu({
      anchor: event.target,
      width: CONTEXT_MENU_WIDTH,
      height: CONTEXT_MENU_HEIGHT
    })
  }

  export function focus () {
    // with just .focus(), sometimes the input doesn't react on onpaste events
    // in Chrome when having a large document open and then doing cut/paste.
    // Calling both .focus() and .select() did solve this issue.
    refHiddenInput.focus()
    refHiddenInput.select()
  }
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
      readOnly={readOnly}
      historyState={historyState}
      searchText={searchText}
      searching={searching}
      searchResult={searchResult}
      bind:showSearch

      onExpandAll={handleExpandAll}
      onCollapseAll={handleCollapseAll}
      onUndo={handleUndo}
      onRedo={handleRedo}
      onSort={handleSortAll}
      onTransform={handleTransformAll}
      onContextMenu={handleContextMenuFromTreeMenu}

      onSearchText={handleSearchText}
      onNextSearchResult={handleNextSearchResult}
      onPreviousSearchResult={handlePreviousSearchResult}

      onFocus={focus}
      onRenderMenu={onRenderMenu}
    />
  {/if}
  <label class="hidden-input-label">
    <input
      class="hidden-input"
      tabindex="-1"
      bind:this={refHiddenInput}
      on:paste={handlePaste}
    />
  </label>
  {#if json === undefined}
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
    <div class="preview" on:mousedown={event => {
      // this event handler is needed here because on mousedown we set focus to the editor
      event.stopPropagation()
    }}>
      {externalText}
    </div>
  {:else}
    <div class="contents" bind:this={refContents}>
      <JSONNode
        value={json}
        path={[]}
        state={state}
        readOnly={readOnly}
        searchResult={searchResult && searchResult.itemsWithActive}
        validationErrors={validationErrors}
        onPatch={handlePatch}
        onInsert={handleInsert}
        onExpand={handleExpand}
        onSelect={handleSelect}
        onExpandSection={handleExpandSection}
        onContextMenu={openContextMenu}
        onClassName={onClassName || noop}
        selection={selection}
      />
    </div>
    {#if textIsRepaired && externalText !== undefined}
      <Message
        type="success"
        message="The loaded JSON document was invalid but is successfully repaired."
        actions={[
          {
            icon: faCheck,
            text: 'Ok',
            onClick: emitOnChange
          },
          {
            icon: faCode,
            text: 'Repair manually instead',
            onClick: onRequestRepair
          }
        ]}
      />
    {/if}
  {/if}
</div>

<style src="./TreeMode.scss"></style>
