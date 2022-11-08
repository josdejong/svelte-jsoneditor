<svelte:options immutable={true} />

<script lang="ts">
  import type {
    AfterPatchCallback,
    Content,
    ContentErrors,
    DocumentState,
    ExtendedSearchResultItem,
    HistoryItem,
    JSONEditorContext,
    JSONParser,
    JSONPatchResult,
    JSONSelection,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnFocus,
    OnJSONEditorModal,
    OnRenderMenu,
    OnRenderValue,
    OnSortModal,
    OnTransformModal,
    ParseError,
    PastedJson,
    SortedColumn,
    TransformModalOptions,
    ValidationError,
    Validator,
    ValueNormalization
  } from '../../../types'
  import { Mode, SelectionType, SortDirection, ValidationSeverity } from '../../../types'
  import TableMenu from './menu/TableMenu.svelte'
  import type { JSONPatchDocument, JSONPath, JSONValue } from 'immutable-json-patch'
  import {
    compileJSONPointer,
    existsIn,
    getIn,
    immutableJSONPatch,
    isJSONArray
  } from 'immutable-json-patch'
  import { isTextContent, normalizeJsonParseError } from '../../../utils/jsonUtils'
  import {
    calculateVisibleSection,
    getColumns,
    selectNextColumn,
    selectNextRow,
    selectPreviousColumn,
    selectPreviousRow
  } from '../../../logic/table.js'
  import { isEmpty, isEqual, uniqueId } from 'lodash-es'
  import JSONValueComponent from './JSONValue.svelte'
  import {
    activeElementIsChildOf,
    createNormalizationFunctions,
    getDataPathFromTarget,
    getWindow
  } from '../../../utils/domUtils'
  import { createDebug } from '$lib/utils/debug'
  import { createDocumentState, documentStatePatch } from '$lib/logic/documentState'
  import { isObjectOrArray } from '$lib/utils/typeUtils.js'
  import TableTag from '$lib/components/modes/tablemode/tag/TableTag.svelte'
  import { revertJSONPatchWithMoveOperations } from '$lib/logic/operations'
  import {
    createValueSelection,
    isEditingSelection,
    isPathInsideSelection,
    removeEditModeFromSelection
  } from '$lib/logic/selection'
  import { createHistory } from '$lib/logic/history'
  import ColumnHeader from '$lib/components/modes/tablemode/ColumnHeader.svelte'
  import { sortJson } from '$lib/logic/sort'
  import { encodeDataPath } from '$lib/utils/domUtils.js'
  import { isValueSelection } from '$lib/logic/selection.js'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'
  import { createFocusTracker } from '$lib/components/controls/createFocusTracker'
  import { onDestroy, onMount } from 'svelte'
  import jsonrepair from 'jsonrepair'
  import Message from '$lib/components/controls/Message.svelte'
  import { faCheck, faCode } from '@fortawesome/free-solid-svg-icons'
  import { measure } from '$lib/utils/timeUtils'
  import memoizeOne from 'memoize-one'
  import { validateJSON } from '$lib/logic/validation'
  import ValidationErrorsOverview from '$lib/components/controls/ValidationErrorsOverview.svelte'
  import { MAX_CHARACTERS_TEXT_PREVIEW } from '$lib/constants.js'
  import { truncate } from '$lib/utils/stringUtils.js'
  import { getText } from '$lib/utils/jsonUtils.js'

  const debug = createDebug('jsoneditor:TableMode')
  const sortModalId = uniqueId()
  const transformModalId = uniqueId()

  const isSSR = typeof window === 'undefined'
  debug('isSSR:', isSSR)

  export let readOnly: boolean
  export let externalContent: Content
  export let mainMenuBar: boolean
  export let escapeControlCharacters: boolean
  export let escapeUnicodeCharacters: boolean
  export let flattenColumns: boolean
  export let parser: JSONParser
  export let validator: Validator | null
  export let validationParser: JSONParser
  export let indentation: number | string
  export let onChange: OnChange
  export let onChangeMode: OnChangeMode
  export let onRenderValue: OnRenderValue
  export let onRenderMenu: OnRenderMenu
  export let onFocus: OnFocus
  export let onBlur: OnBlur
  export let onSortModal: OnSortModal
  export let onTransformModal: OnTransformModal
  export let onJSONEditorModal: OnJSONEditorModal

  let normalization: ValueNormalization
  $: normalization = createNormalizationFunctions({
    escapeControlCharacters,
    escapeUnicodeCharacters
  })

  let refJsonEditor
  let refContents
  let refHiddenInput

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

  $: applyExternalContent(externalContent)

  let columns: JSONPath[]
  $: columns = isJSONArray(json) ? getColumns(json, flattenColumns) : []

  $: containsValidArray = json && !isEmpty(columns)

  // modalOpen is true when one of the modals is open.
  // This is used to track whether the editor still has focus
  let modalOpen = false
  let hasFocus = false

  let itemHeightsCache: Record<number, number> = {}

  let viewPortHeight = 600
  let scrollTop = 0
  let defaultItemHeight = 22 // px

  $: visibleSection = calculateVisibleSection(
    scrollTop,
    viewPortHeight,
    json,
    itemHeightsCache, // warning: itemHeightsCache is mutated and is not responsive itself
    defaultItemHeight
  )

  // $: debug('visibleSection', visibleSection) // TODO: cleanup

  $: refreshScrollTop(json)

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function refreshScrollTop(_json: JSONValue | undefined) {
    // When the contents go from lots of items and scrollable contents to only a few items and
    // no vertical scroll, the actual scrollTop changes to 0 but there is no on:scroll event
    // triggered, so the internal scrollTop variable is not up-to-date.
    // This is a workaround to update the scrollTop by triggering an on:scroll event
    if (refContents) {
      refContents.scrollTo({
        top: refContents.scrollTop,
        left: refContents.scrollLeft
      })
    }
  }

  function clearSortedColumn() {
    if (documentState.sortedColumn) {
      documentState = {
        ...documentState,
        sortedColumn: undefined
      }
    }
  }

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

  function clearSelectionWhenNotExisting(json: JSONValue) {
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

  let documentState = createDocumentState()
  let textIsRepaired = false // FIXME: implement repairing text
  const searchResultItems: ExtendedSearchResultItem[] | undefined = undefined // FIXME: implement support for search and replace

  function onSortByHeader(newSortedColumn: SortedColumn) {
    debug('onSortByHeader', newSortedColumn)

    const rootPath = []
    const direction = newSortedColumn.sortDirection === SortDirection.desc ? -1 : 1
    const operations = sortJson(json, rootPath, newSortedColumn.path, direction)
    handlePatch(operations, (patchedJson, patchedState) => {
      return {
        state: {
          ...patchedState,
          sortedColumn: newSortedColumn
        }
      }
    })
  }

  const history = createHistory<HistoryItem>({
    onChange: (state) => {
      historyState = state
    }
  })
  let historyState = history.getState()

  let context: JSONEditorContext
  $: context = {
    readOnly,
    parser,
    normalization,
    getJson: () => json,
    getDocumentState: () => documentState,
    findElement: () => null, // FIXME: implement findElement?
    findNextInside,
    focus,
    onPatch: handlePatch,
    onSelect: updateSelection,
    onFind: handleFind,
    onPasteJson: handlePasteJson,
    onRenderValue
  }

  function applyExternalContent(content: Content) {
    const currentContent = { json }
    const isChanged = isTextContent(content)
      ? content.text !== text
      : !isEqual(currentContent.json, content.json)

    debug('update external content', { isChanged })

    if (!isChanged) {
      // no actual change, don't do anything
      return
    }

    const previousContent = { json, text }
    const previousJson = json
    const previousState = documentState
    const previousText = text
    const previousTextIsRepaired = textIsRepaired

    if (isTextContent(content)) {
      try {
        json = JSON.parse(content.text)
        text = content.text
        textIsRepaired = false
        parseError = undefined
      } catch (err) {
        try {
          json = parser.parse(jsonrepair(content.text))
          text = content.text
          textIsRepaired = true
          parseError = undefined
        } catch (repairError) {
          // no valid JSON, will show empty document or invalid json
          json = undefined
          text = externalContent.text
          textIsRepaired = false
          parseError = normalizeJsonParseError(text, err.message || err.toString())
        }
      }
    } else {
      json = content.json
      text = undefined
      textIsRepaired = false
      parseError = undefined
    }

    // make sure the selection is valid
    clearSelectionWhenNotExisting(json)

    // reset the sorting order (we don't know...)
    clearSortedColumn()

    addHistoryItem({
      previousJson,
      previousState,
      previousText,
      previousTextIsRepaired
    })

    // we could work out a patchResult, or use patch(), but only when the previous and new
    // contents are both json and not text. We go for simplicity and consistency here and
    // let the function applyExternalContent _not_ return a patchResult ever.
    const patchResult = null

    emitOnChange(previousContent, patchResult)
  }

  // TODO: addHistoryItem is a duplicate of addHistoryItem in TreeMode.svelte. Can we extract and reuse this logic?
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

  let validationErrors: ValidationError[] = []
  $: updateValidationErrors(json, validator, parser, validationParser)

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

  export function validate(): ContentErrors {
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
    return {
      validationErrors
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

    const previousContent: Content = { json }
    const previousJson = json
    const previousState = documentState
    const previousTextIsRepaired = textIsRepaired

    // execute the patch operations
    const undo: JSONPatchDocument = revertJSONPatchWithMoveOperations(
      json,
      operations
    ) as JSONPatchDocument
    const patched = documentStatePatch(json, documentState, operations)

    const callback =
      typeof afterPatch === 'function' ? afterPatch(patched.json, patched.documentState) : undefined

    json = callback && callback.json !== undefined ? callback.json : patched.json
    const newState =
      callback && callback.state !== undefined ? callback.state : patched.documentState
    documentState = newState
    text = undefined
    textIsRepaired = false

    history.add({
      undo: {
        patch: undo,
        json: undefined,
        text: undefined,
        state: removeEditModeFromSelection(previousState),
        textIsRepaired: previousTextIsRepaired
      },
      redo: {
        patch: operations,
        json: undefined,
        state: removeEditModeFromSelection(newState),
        text: undefined,
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

  function handlePatch(
    operations: JSONPatchDocument,
    afterPatch?: AfterPatchCallback
  ): JSONPatchResult {
    return patch(operations, afterPatch)
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

  function handleFind(findAndReplace: boolean) {
    // FIXME: implement handleFind
  }

  function handlePasteJson(newPastedJson: PastedJson) {
    // FIXME: implement handlePasteJson
  }

  function findNextInside(path: JSONPath): JSONSelection {
    const index = parseInt(path[0])
    const nextPath = [String(index + 1), ...path.slice(1)]

    return existsIn(json, nextPath)
      ? createValueSelection(nextPath, false)
      : createValueSelection(path, false)
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

  function handleScroll(event: Event) {
    scrollTop = event.target['scrollTop']
  }

  function handleMouseDown(event: Event) {
    const path = event?.target ? getDataPathFromTarget(event.target as HTMLElement) : undefined
    if (path) {
      // when clicking inside the current selection, editing a value, do nothing
      if (
        isEditingSelection(documentState.selection) &&
        isPathInsideSelection(documentState.selection, path, SelectionType.value)
      ) {
        return
      }

      updateSelection(createValueSelection(path, false))

      focus()
      event.preventDefault()
    }
  }

  function createDefaultSelection(): JSONSelection | undefined {
    if (isJSONArray(json) && !isEmpty(json) && !isEmpty(columns)) {
      // Select the first row, first column
      const path = ['0', ...columns[0]]

      return createValueSelection(path, false)
    } else {
      return undefined
    }
  }

  function createDefaultSelectionWhenUndefined() {
    if (!documentState.selection) {
      updateSelection(createDefaultSelection())
    }
  }

  export function acceptAutoRepair() {
    if (textIsRepaired && json !== undefined) {
      const previousState = documentState
      const previousJson = json
      const previousText = text
      const previousContent = { json, text }
      const previousTextIsRepaired = textIsRepaired

      // json stays as is
      text = undefined
      textIsRepaired = false

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

    return { json, text }
  }

  function handleRequestRepair() {
    onChangeMode(Mode.text)
  }

  function handleKeyDown(event) {
    // get key combo, and normalize key combo from Mac: replace "Command+X" with "Ctrl+X" etc
    const combo = keyComboFromEvent(event).replace(/^Command\+/, 'Ctrl+')
    debug('keydown', { combo, key: event.key })

    if (combo === 'Left') {
      event.preventDefault()

      createDefaultSelectionWhenUndefined()

      if (documentState.selection) {
        updateSelection(selectPreviousColumn(columns, documentState.selection))
      }
    }

    if (combo === 'Right') {
      event.preventDefault()

      createDefaultSelectionWhenUndefined()

      if (documentState.selection) {
        updateSelection(selectNextColumn(columns, documentState.selection))
      }
    }

    if (combo === 'Up') {
      event.preventDefault()

      createDefaultSelectionWhenUndefined()

      if (documentState.selection) {
        updateSelection(selectPreviousRow(columns, documentState.selection))
      }
    }

    if (combo === 'Down') {
      event.preventDefault()

      createDefaultSelectionWhenUndefined()

      if (documentState.selection) {
        updateSelection(selectNextRow(json, columns, documentState.selection))
      }
    }

    if (combo === 'Enter' && documentState.selection) {
      if (isValueSelection(documentState.selection)) {
        event.preventDefault()

        const path = documentState.selection.focusPath
        const value = getIn(json, path)
        if (isObjectOrArray(value)) {
          // edit nested object/array
          openJSONEditorModal(path, value)
        } else {
          if (!readOnly) {
            // go to value edit mode
            updateSelection({ ...documentState.selection, edit: true })
          }
        }
      }
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

  function handlePaste(event) {
    event.preventDefault()

    if (readOnly) {
      return
    }

    const clipboardText = event.clipboardData.getData('text/plain')

    // FIXME: implement handlePaste
    // try {
    //   doPaste(clipboardText)
    // } catch (err) {
    //   openRepairModal(clipboardText, (repairedText) => {
    //     debug('repaired pasted text: ', repairedText)
    //     doPaste(repairedText)
    //   })
    // }
  }

  function handleSelectValidationError(error: ValidationError) {
    debug('select validation error', error)

    updateSelection(createValueSelection(error.path, false))

    // scrollTo(error.path) // FIXME: scroll to selected error
  }

  function openSortModal(selectedPath: JSONPath) {
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

        handlePatch(operations)
      },
      onClose: () => {
        modalOpen = false
        focus()
      }
    })
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

            handlePatch(operations)
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

  function openJSONEditorModal(path: JSONPath, value: JSONValue) {
    debug('openJSONEditorModal', { path, value })

    modalOpen = true

    // open a popup where you can edit the nested object/array
    onJSONEditorModal({
      // TODO: make the default mode of the JSONEditorModal configurable?
      mode: isJSONArray(value) ? Mode.table : Mode.tree,
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

  function handleSortAll() {
    const selectedPath = []
    openSortModal(selectedPath)
  }

  function handleTransformAll() {
    openTransformModal({
      selectedPath: []
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

    debug('undo', { item, json })

    const patchResult = {
      json,
      previousJson: previousContent.json,
      redo: item.undo.patch,
      undo: item.redo.patch
    }

    emitOnChange(previousContent, patchResult)

    // FIXME: handle focus and selection
    // focus()
    // if (documentState.selection) {
    //   scrollTo(documentState.selection.focusPath, false)
    // }
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

    debug('redo', { item, json })

    const patchResult = {
      json,
      previousJson: previousContent.json,
      redo: item.redo.patch,
      undo: item.undo.patch
    }

    emitOnChange(previousContent, patchResult)

    // FIXME: handle focus and selection
    // focus()
    // if (documentState.selection) {
    //   scrollTo(documentState.selection.focusPath, false)
    // }
  }

  function isPathSelected(path: JSONPath, selection: JSONSelection): boolean {
    return selection ? selection.pointersMap[compileJSONPointer(path)] === true : false
  }
</script>

<div
  class="jse-table-mode"
  class:no-main-menu={!mainMenuBar}
  on:mousedown={handleMouseDown}
  on:keydown={handleKeyDown}
  bind:this={refJsonEditor}
>
  {#if mainMenuBar}
    <TableMenu
      {json}
      {readOnly}
      {historyState}
      onSort={handleSortAll}
      onTransform={handleTransformAll}
      onUndo={handleUndo}
      onRedo={handleRedo}
      {onRenderMenu}
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
    {#if containsValidArray}
      <div
        class="jse-contents"
        bind:this={refContents}
        bind:clientHeight={viewPortHeight}
        on:scroll={handleScroll}
      >
        <table class="jse-table-main">
          <tbody>
            <tr class="jse-table-row jse-table-row-header">
              <th class="jse-table-cell jse-table-cell-header" />
              {#each columns as column}
                <th class="jse-table-cell jse-table-cell-header">
                  <ColumnHeader
                    path={column}
                    sortedColumn={documentState.sortedColumn}
                    onSort={onSortByHeader}
                  />
                </th>
              {/each}
            </tr>
            <tr class="jse-table-invisible-start-section">
              <td style:height={visibleSection.startHeight + 'px'} colspan={columns.length} />
            </tr>
            {#each visibleSection.visibleItems as item, visibleIndex}
              {@const index = visibleSection.startIndex + visibleIndex}
              <tr class="jse-table-row">
                <th
                  class="jse-table-cell jse-table-cell-gutter"
                  bind:clientHeight={itemHeightsCache[index]}>{index + 1}</th
                >
                {#each columns as column}
                  {@const path = [String(index)].concat(column)}
                  {@const value = getIn(item, column)}
                  {@const isSelected = isPathSelected(path, documentState.selection)}
                  <td
                    class="jse-table-cell"
                    data-path={encodeDataPath(path)}
                    class:jse-selected-value={isSelected &&
                      isValueSelection(documentState.selection)}
                  >
                    {#if isObjectOrArray(value)}
                      <TableTag {path} {value} {isSelected} onEdit={openJSONEditorModal} />
                    {:else if value !== undefined}
                      <JSONValueComponent
                        {path}
                        {value}
                        enforceString={false}
                        selection={isSelected ? documentState.selection : undefined}
                        {searchResultItems}
                        {context}
                      />
                    {/if}
                  </td>
                {/each}
              </tr>
            {/each}

            <tr class="jse-table-invisible-end-section">
              <td style:height={visibleSection.endHeight + 'px'} colspan={columns.length} />
            </tr>
          </tbody>
        </table>
      </div>

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
    {:else if parseError}
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
      <div class="jse-preview">
        {truncate(text || '', MAX_CHARACTERS_TEXT_PREVIEW)}
      </div>
    {:else}
      <Message
        type="info"
        message="The loaded JSON document is not an array and cannot be rendered in table mode."
        actions={[
          {
            text: 'Edit in tree mode',
            onClick: () => onChangeMode(Mode.tree)
          }
        ]}
      />
      <div class="jse-preview">
        {truncate(getText({ text, json }, indentation, parser), MAX_CHARACTERS_TEXT_PREVIEW)}
      </div>
    {/if}
  {:else}
    <div class="jse-contents jse-contents-loading">
      <div class="jse-loading-space" />
      <div class="jse-loading">loading...</div>
    </div>
  {/if}
</div>

<style src="./TableMode.scss"></style>
