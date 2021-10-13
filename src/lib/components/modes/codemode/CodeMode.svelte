<svelte:options immutable={true} />

<script>
  import { faExclamationTriangle, faWrench } from '@fortawesome/free-solid-svg-icons'
  import createDebug from 'debug'
  import { immutableJSONPatch, revertJSONPatch } from 'immutable-json-patch'
  import jsonrepair from 'jsonrepair'
  import { debounce, uniqueId } from 'lodash-es'
  import { getContext, onDestroy, onMount } from 'svelte'
  import {
    CHECK_VALID_JSON_DELAY,
    CODE_MODE_ONCHANGE_DELAY,
    JSON_STATUS_INVALID,
    JSON_STATUS_REPAIRABLE,
    JSON_STATUS_VALID,
    MAX_AUTO_REPAIRABLE_SIZE,
    MAX_DOCUMENT_SIZE_CODE_MODE,
    SORT_MODAL_OPTIONS,
    TRANSFORM_MODAL_OPTIONS
  } from '$lib/constants'
  import { activeElementIsChildOf, getWindow } from '../../../utils/domUtils'
  import { formatSize } from '$lib/utils/fileUtils'
  import { findTextLocation } from '$lib/utils/jsonUtils'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'
  import Message from '../../controls/Message.svelte'
  import ValidationErrorsOverview from '../../controls/ValidationErrorsOverview.svelte'
  import SortModal from '../../modals/SortModal.svelte'
  import TransformModal from '../../modals/TransformModal.svelte'
  import CodeMenu from './menu/CodeMenu.svelte'

  export let readOnly = false
  export let mainMenuBar = true
  export let text = ''
  export let indentation = 2 // TODO: make indentation configurable
  export let aceTheme = 'ace/theme/jsoneditor' // TODO: make aceTheme configurable
  export let validator = null
  export let onChange = null
  export let onSwitchToTreeMode = () => {}
  export let onError
  export let onFocus = () => {}
  export let onBlur = () => {}
  export let onRenderMenu = () => {}

  const debug = createDebug('jsoneditor:CodeMode')

  const isSSR = typeof window === 'undefined'
  debug('isSSR:', isSSR)

  let aceEditorRef
  let aceEditor
  let aceEditorText
  let domCodeMode

  let onChangeDisabled = false
  let acceptTooLarge = false

  let validationErrorsList = []

  $: isNewDocument = text.length === 0
  $: tooLarge = text && text.length > MAX_DOCUMENT_SIZE_CODE_MODE
  $: aceEditorDisabled = tooLarge && !acceptTooLarge

  $: setAceEditorValue(text)
  $: updateIndentation(indentation)
  $: updateReadOnly(readOnly)

  onMount(async () => {
    if (isSSR) {
      return
    }

    try {
      // We load ace dynamically to prevent trying to load it serverside (SSR),
      // since this is not supported by ace
      const { ace } = await import('./ace/index.js')

      aceEditor = createAceEditor({
        target: aceEditorRef,
        ace,
        readOnly,
        indentation,
        onChange: onChangeAceEditorValueDebounced
      })

      if (resizeObserver) {
        resizeObserver.observe(aceEditorRef)
      } else {
        debug('WARNING: ResizeObserver is undefined. Code editor will not automatically be resized')
      }

      // load initial text
      setAceEditorValue(text)
      aceEditor.session.getUndoManager().reset()

      focus()
    } catch (err) {
      // TODO: report error to the user
      console.error(err)
    }
  })

  onDestroy(() => {
    checkValidJsonDebounced.cancel()
    updateCancelUndoRedoDebounced.cancel()

    if (resizeObserver) {
      resizeObserver.unobserve(aceEditorRef)
      resizeObserver = null
    }

    if (aceEditor) {
      debug('Destroy Ace editor')
      aceEditor.destroy()
      aceEditor = null
    }
  })

  let canUndo = false
  let canRedo = false

  let resizeObserver =
    typeof window !== 'undefined' && window.ResizeObserver
      ? new window.ResizeObserver(resize)
      : null

  const { open } = getContext('simple-modal')
  const sortModalId = uniqueId()
  const transformModalId = uniqueId()

  export function focus() {
    if (aceEditor) {
      aceEditor.focus()
    }
  }

  // modalOpen is true when one of the modals is open.
  // This is used to track whether the editor still has focus
  let modalOpen = false

  createFocusTracker({
    onMount,
    onDestroy,
    getWindow: () => getWindow(domCodeMode),
    hasFocus: () => (modalOpen && document.hasFocus()) || activeElementIsChildOf(domCodeMode),
    onFocus,
    onBlur
  })

  /**
   * @param {JSONPatchDocument} operations
   */
  export function patch(operations) {
    debug('patch', operations)

    const oldText = text
    const json = JSON.parse(text)
    const updatedJson = immutableJSONPatch(json, operations)
    const undo = revertJSONPatch(json, operations)
    text = JSON.stringify(updatedJson, null, indentation)

    if (text !== oldText) {
      emitOnChange()
    }

    return {
      json,
      undo,
      redo: operations
    }
  }

  function resize() {
    if (aceEditor) {
      const force = false
      aceEditor.resize(force)
    }
  }

  function handleFormat() {
    debug('format')
    try {
      const oldText = text
      const json = JSON.parse(text)
      text = JSON.stringify(json, null, indentation)

      if (text !== oldText) {
        emitOnChange()
      }
    } catch (err) {
      onError(err)
    }
  }

  function handleCompact() {
    debug('compact')
    try {
      const oldText = text
      const json = JSON.parse(text)
      text = JSON.stringify(json)

      if (text !== oldText) {
        emitOnChange()
      }
    } catch (err) {
      onError(err)
    }
  }

  function handleRepair() {
    debug('repair')
    try {
      const oldText = text
      text = jsonrepair(text)
      jsonStatus = JSON_STATUS_VALID
      jsonParseError = undefined

      if (text !== oldText) {
        emitOnChange()
      }
    } catch (err) {
      onError(err)
    }
  }

  function handleSort() {
    if (readOnly) {
      return
    }

    try {
      const json = JSON.parse(text)

      modalOpen = true

      open(
        SortModal,
        {
          id: sortModalId,
          json,
          selectedPath: [],
          onSort: async (operations) => {
            debug('onSort', operations)
            patch(operations)
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
    } catch (err) {
      onError(err)
    }
  }

  export function openTransformModal({ id, selectedPath, onTransform, onClose }) {
    try {
      const json = JSON.parse(text)

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

                patch(operations)
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
    } catch (err) {
      onError(err)
    }
  }

  function handleTransform() {
    if (readOnly) {
      return
    }

    openTransformModal({
      selectedPath: []
    })
  }

  function handleToggleSearch() {
    if (aceEditor.searchBox) {
      // toggle
      if (aceEditor.searchBox.active) {
        aceEditor.searchBox.hide()
      } else {
        aceEditor.searchBox.show()
      }
    } else {
      // first time initialization
      aceEditor.execCommand('find')
    }
  }

  function handleUndo() {
    if (aceEditor) {
      aceEditor.getSession().getUndoManager().undo(false)
    }
  }

  function handleRedo() {
    if (aceEditor) {
      aceEditor.getSession().getUndoManager().redo(false)
    }
  }

  function handleKeyDown(event) {
    // get key combo, and normalize key combo from Mac: replace "Command+X" with "Ctrl+X" etc
    const combo = keyComboFromEvent(event).replace(/^Command\+/, 'Ctrl+')

    debug('keydown', combo)

    if (
      combo === 'Ctrl+I' ||
      combo === 'Ctrl+\\' // for backward compatibility
    ) {
      event.preventDefault()
      event.stopPropagation()
      handleFormat()
    }

    if (
      combo === 'Ctrl+Shift+I' ||
      combo === 'Ctrl+Shift+\\' // for backward compatibility
    ) {
      event.preventDefault()
      event.stopPropagation()
      handleCompact()
    }
  }

  function handleAcceptTooLarge() {
    acceptTooLarge = true
    setAceEditorValue(text, true)
  }

  function cancelLoadTooLarge() {
    // copy the latest contents of the Ace editor again into text
    onChangeAceEditorValue()
  }

  /**
   * @param {ValidationError} error
   **/
  function handleSelectValidationError(error) {
    debug('select validation error', error)

    const annotation = validationErrorToAnnotation(error)
    const location = {
      row: annotation.row,
      column: annotation.column
    }
    setSelection(location, location)
    focus()
  }

  /**
   * @param {Point} start
   * @param {Point} end
   **/
  function setSelection(start, end) {
    if (aceEditor) {
      aceEditor.selection.setRange({ start, end })
      aceEditor.scrollToLine(start.row, true)
    }
  }

  function createAceEditor({ target, ace, readOnly, indentation, onChange }) {
    debug('create Ace editor')

    const editor = ace.edit(target)
    const aceSession = editor.getSession()
    editor.$blockScrolling = Infinity
    editor.setTheme(aceTheme)
    editor.setOptions({ readOnly })
    editor.setShowPrintMargin(false)
    editor.setFontSize('14px') // must correspond with CSS $font-size-mono
    aceSession.setMode('ace/mode/json')
    aceSession.setTabSize(indentation)
    aceSession.setUseSoftTabs(true)
    aceSession.setUseWrapMode(true)

    // disable Ctrl+L quickkey of Ace (is used by the browser to select the address bar)
    editor.commands.bindKey('Ctrl-L', null)
    editor.commands.bindKey('Command-L', null)

    // disable the quickkeys we want to use for Format and Compact
    editor.commands.bindKey('Ctrl-\\', null)
    editor.commands.bindKey('Command-\\', null)
    editor.commands.bindKey('Ctrl-Shift-\\', null)
    editor.commands.bindKey('Command-Shift-\\', null)

    // replace ace setAnnotations with custom function that also covers jsoneditor annotations
    const originalSetAnnotations = aceSession.setAnnotations
    aceSession.setAnnotations = function (annotations) {
      if (text !== '') {
        const newAnnotations =
          annotations && annotations.length
            ? annotations
            : validationErrorsList.map(validationErrorToAnnotation)

        debug('setAnnotations', { annotations, newAnnotations })

        originalSetAnnotations.call(this, newAnnotations)
      } else {
        originalSetAnnotations.call(this, [])
      }
    }

    // register onchange event
    editor.on('change', onChange)

    return editor
  }

  function validationErrorToAnnotation(validationError) {
    const location = findTextLocation(text, validationError.path)

    return {
      row: location ? location.row : 0,
      column: location ? location.column : 0,
      text: validationError.message,
      type: 'warning'
    }
  }

  /**
   * refresh ERROR annotations state
   * error annotations are handled by the ace json mode (ace/mode/json)
   * validation annotations are handled by this mode
   * therefore in order to refresh we send only the annotations of error type in order to maintain its state
   * @private
   */
  function refreshAnnotations() {
    debug('refresh annotations')
    const session = aceEditor && aceEditor.getSession()
    if (session) {
      const errorAnnotations = session
        .getAnnotations()
        .filter((annotation) => annotation.type === 'error')

      session.setAnnotations(errorAnnotations)
    }
  }

  function setAceEditorValue(text, force = false) {
    if (aceEditorDisabled && !force) {
      debug('not applying text: editor is disabled')
      return
    }

    onChangeDisabled = true
    if (aceEditor && text !== aceEditorText) {
      aceEditorText = text
      aceEditor.setValue(text, -1)

      updateCancelUndoRedoDebounced()
    }
    onChangeDisabled = false
  }

  function onChangeAceEditorValue() {
    if (onChangeDisabled) {
      return
    }

    aceEditorText = aceEditor.getValue()

    if (text !== aceEditorText) {
      text = aceEditorText

      updateCancelUndoRedoDebounced()

      emitOnChange()
    }
  }

  function updateIndentation(indentation) {
    if (aceEditor) {
      aceEditor.getSession().setTabSize(indentation)
    }
  }

  function updateReadOnly(readOnly) {
    if (aceEditor) {
      aceEditor.setOptions({ readOnly })
    }
  }

  function updateCanUndoRedo() {
    const undoManager = aceEditor ? aceEditor.getSession().getUndoManager() : undefined

    if (undoManager && undoManager.hasUndo && undoManager.hasRedo) {
      canUndo = undoManager.hasUndo()
      canRedo = undoManager.hasRedo()
    }
  }

  const updateCancelUndoRedoDebounced = debounce(updateCanUndoRedo, 0) // just on next tick

  // debounce the input: when pressing Enter at the end of a line, two change
  // events are fired: one with the new Return character, and a second with
  // indentation added on the new line. This causes a race condition when used
  // for example in React. Debouncing the onChange events also results in not
  // firing a change event with every character that a user types, but only as
  // soon as the user stops typing.
  const onChangeAceEditorValueDebounced = debounce(onChangeAceEditorValue, CODE_MODE_ONCHANGE_DELAY)

  function emitOnChange() {
    if (onChange) {
      onChange(text)
    }
  }

  let jsonStatus = JSON_STATUS_VALID
  let jsonParseError

  function checkValidJson() {
    jsonStatus = JSON_STATUS_VALID
    jsonParseError = undefined
    validationErrorsList = []

    // FIXME: utilize the parse errors coming from AceEditor worker, only try to repair then
    if (text.length > MAX_AUTO_REPAIRABLE_SIZE) {
      debug('checkValidJson: not validating, document too large')
      return
    }

    if (isNewDocument) {
      // new, empty document, do not try to parse
      return
    }

    try {
      // FIXME: instead of parsing the JSON here (which is expensive),
      //  get the parse error from the Ace Editor worker instead
      const json = JSON.parse(text)

      if (validator) {
        validationErrorsList = validator(json)
      }

      refreshAnnotations()
    } catch (err) {
      jsonParseError = err.toString()
      try {
        JSON.parse(jsonrepair(text))
        jsonStatus = JSON_STATUS_REPAIRABLE
      } catch (err) {
        jsonStatus = JSON_STATUS_INVALID
      }
    }

    debug('checked json status', jsonStatus)
  }

  const checkValidJsonDebounced = debounce(checkValidJson, CHECK_VALID_JSON_DELAY)

  // we pass unused arguments to trigger calling checkValidJson when text or validator changes
  // TODO: find a better solution
  $: checkValidJsonDebounced(text)
  $: checkValidJson(validator)

  $: repairActions =
    jsonStatus === JSON_STATUS_REPAIRABLE
      ? [
          {
            icon: faWrench,
            text: 'Auto repair',
            title: 'Automatically repair JSON',
            onClick: handleRepair
          }
        ]
      : []
</script>

<div class="code-mode" on:keydown={handleKeyDown} bind:this={domCodeMode}>
  {#if mainMenuBar}
    <CodeMenu
      {readOnly}
      onFormat={handleFormat}
      onCompact={handleCompact}
      onSort={handleSort}
      onTransform={handleTransform}
      onToggleSearch={handleToggleSearch}
      onUndo={handleUndo}
      onRedo={handleRedo}
      canFormat={!isNewDocument}
      canCompact={!isNewDocument}
      canSort={!isNewDocument}
      canTransform={!isNewDocument}
      {canUndo}
      {canRedo}
      {onRenderMenu}
    />
  {/if}

  {#if !isSSR}
    {#if aceEditorDisabled}
      <Message
        icon={faExclamationTriangle}
        type="error"
        message={`The JSON document is larger than ${formatSize(
          MAX_DOCUMENT_SIZE_CODE_MODE,
          1024
        )}, ` +
          `and may crash your browser when loading it in code mode. Actual size: ${formatSize(
            text.length,
            1024
          )}.`}
        actions={[
          {
            text: 'Open anyway',
            title: 'Open the document in code mode. This may freeze or crash your browser.',
            onClick: handleAcceptTooLarge
          },
          {
            text: 'Open in tree mode',
            title: 'Open the document in tree mode. Tree mode can handle large documents.',
            onClick: onSwitchToTreeMode
          },
          {
            text: 'Cancel',
            title: 'Cancel opening this large document.',
            onClick: cancelLoadTooLarge
          }
        ]}
      />
    {/if}

    <div class="contents" class:visible={!aceEditorDisabled} bind:this={aceEditorRef} />

    {#if jsonParseError}
      <Message
        type="error"
        icon={faExclamationTriangle}
        message={jsonParseError}
        actions={repairActions}
      />
    {/if}

    <ValidationErrorsOverview {validationErrorsList} selectError={handleSelectValidationError} />
  {:else}
    <div class="contents" class:visible={true}>
      <div class="loading-space" />
      <div class="loading">loading...</div>
    </div>
  {/if}
</div>

<style src="./CodeMode.scss"></style>
