<script>
  import {
    faExclamationTriangle,
    faInfoCircle,
    faWrench
  } from '@fortawesome/free-solid-svg-icons'
  import createDebug from 'debug'
  import { immutableJSONPatch, revertJSONPatch } from 'immutable-json-patch'
  import jsonrepair from 'jsonrepair'
  import { debounce, uniqueId } from 'lodash-es'
  import { getContext, onDestroy, onMount } from 'svelte'
  import {
    CHECK_VALID_JSON_DELAY,
    JSON_STATUS_INVALID,
    JSON_STATUS_REPAIRABLE,
    JSON_STATUS_VALID,
    MAX_DOCUMENT_SIZE_CODE_MODE,
    MAX_REPAIRABLE_SIZE,
    SORT_MODAL_OPTIONS,
    TRANSFORM_MODAL_OPTIONS
  } from '../../../constants.js'
  import { activeElementIsChildOf, getWindow } from '../../../utils/domUtils.js'
  import { keyComboFromEvent } from '../../../utils/keyBindings.js'
  import { formatSize } from '../../../utils/fileUtils.js'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'
  import Message from '../../controls/Message.svelte'
  import SortModal from '../../modals/SortModal.svelte'
  import TransformModal from '../../modals/TransformModal.svelte'
  import ace from './ace/index.js'
  import CodeMenu from './menu/CodeMenu.svelte'

  export let readOnly = false
  export let mainMenuBar = true
  export let text = ''
  export let indentation = 2 // TODO: make indentation configurable
  export let aceTheme = 'ace/theme/jsoneditor' // TODO: make aceTheme configurable
  export let validator
  export let onChange = null
  export let onSwitchToTreeMode = () => {}
  export let onError
  export let onFocus = () => {
  }
  export let onBlur = () => {
  }
  export let onRenderMenu = () => {
  }

  const debug = createDebug('jsoneditor:CodeMode')

  let aceEditorRef
  let aceEditor
  let aceEditorText
  let domCodeMode

  let onChangeDisabled = false
  let acceptTooLarge = false

  $: tooLarge = text && text.length > MAX_DOCUMENT_SIZE_CODE_MODE
  $: aceEditorDisabled = tooLarge && !acceptTooLarge

  $: setAceEditorValue(text)
  $: updateIndentation(indentation)

  onMount(() => {
    aceEditor = createAceEditor({
      target: aceEditorRef,
      ace,
      readOnly,
      indentation,
      onChange: onChangeAceEditorValue
    })

    if (resizeObserver) {
      resizeObserver.observe(aceEditorRef)
    } else {
      debug('WARNING: ResizeObserver is undefined. Code editor will not automatically be resized')
    }

    // load initial text
    setAceEditorValue(text)
    aceEditor.session.getUndoManager().reset()
  })

  onDestroy(() => {
    checkValidJsonDebounced.cancel()
    updateCancelUndoRedoDebounced.cancel()

    if (resizeObserver) {
      resizeObserver.unobserve(aceEditorRef)
      resizeObserver = null
    }

    debug('Destroy Ace editor')
    aceEditor.destroy()
    aceEditor = null
  })

  let canUndo = false
  let canRedo = false

  let resizeObserver = window.ResizeObserver
    ? new window.ResizeObserver(resize)
    : null

  const { open } = getContext('simple-modal')
  const sortModalId = uniqueId()
  const transformModalId = uniqueId()

  export function focus () {
    aceEditor.focus()
  }

  createFocusTracker({
    onMount,
    onDestroy,
    getWindow: () => getWindow(domCodeMode),
    hasFocus: () => activeElementIsChildOf(domCodeMode),
    onFocus,
    onBlur
  })

  /**
   * @param {JSONPatchDocument} operations
   */
  export function patch (operations) {
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

  function resize () {
    const force = false
    aceEditor.resize(force)
  }

  function handleFormat () {
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

  function handleCompact () {
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

  function handleRepair () {
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

  function handleSort () {
    if (readOnly) {
      return
    }

    try {
      const json = JSON.parse(text)

      open(SortModal, {
        id: sortModalId,
        json,
        selectedPath: [],
        onSort: async (operations) => {
          debug('onSort', operations)
          patch(operations)
        }
      }, SORT_MODAL_OPTIONS, {
        onClose: focus
      })
    } catch (err) {
      onError(err)
    }
  }

  function handleTransform () {
    if (readOnly) {
      return
    }

    try {
      const json = JSON.parse(text)

      open(TransformModal, {
        id: transformModalId,
        json: json,
        selectedPath: [],
        indentation,
        onTransform: async (operations) => {
          debug('onTransform', operations)
          patch(operations)
        }
      }, TRANSFORM_MODAL_OPTIONS, {
        onClose: focus
      })
    } catch (err) {
      onError(err)
    }
  }

  function handleUndo () {
    aceEditor.getSession().getUndoManager().undo(false)
  }

  function handleRedo () {
    aceEditor.getSession().getUndoManager().redo(false)
  }

  function handleKeyDown (event) {
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

  function handleAcceptTooLarge () {
    acceptTooLarge = true
    setAceEditorValue(text, true)
  }

  function createAceEditor ({ target, ace, readOnly, indentation, onChange }) {
    debug('create Ace editor')

    const aceEditor = ace.edit(target)
    const aceSession = aceEditor.getSession()
    aceEditor.$blockScrolling = Infinity
    aceEditor.setTheme(aceTheme)
    aceEditor.setOptions({ readOnly })
    aceEditor.setShowPrintMargin(false)
    aceEditor.setFontSize('14px') // must correspond with CSS $font-size-mono
    aceSession.setMode('ace/mode/json')
    aceSession.setTabSize(indentation)
    aceSession.setUseSoftTabs(true)
    aceSession.setUseWrapMode(true)

    // disable Ctrl+L quickkey of Ace (is used by the browser to select the address bar)
    aceEditor.commands.bindKey('Ctrl-L', null)
    aceEditor.commands.bindKey('Command-L', null)

    // disable the quickkeys we want to use for Format and Compact
    aceEditor.commands.bindKey('Ctrl-\\', null)
    aceEditor.commands.bindKey('Command-\\', null)
    aceEditor.commands.bindKey('Ctrl-Shift-\\', null)
    aceEditor.commands.bindKey('Command-Shift-\\', null)

    // register onchange event
    aceEditor.on('change', onChange)

    return aceEditor
  }

  function setAceEditorValue (text, force = false) {
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

  function onChangeAceEditorValue () {
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

  function updateIndentation (indentation) {
    if (aceEditor) {
      aceEditor.getSession().setTabSize(indentation)
    }
  }

  function updateCanUndoRedo () {
    const undoManager = aceEditor.getSession().getUndoManager()

    if (undoManager && undoManager.hasUndo && undoManager.hasRedo) {
      canUndo = undoManager.hasUndo()
      canRedo = undoManager.hasRedo()
    }
  }

  const updateCancelUndoRedoDebounced = debounce(updateCanUndoRedo, 0) // just on next tick

  function emitOnChange () {
    if (onChange) {
      onChange(text)
    }
  }

  let jsonStatus = JSON_STATUS_VALID
  let jsonParseError

  function checkValidJson (text) {
    jsonStatus = JSON_STATUS_VALID
    jsonParseError = undefined

    // FIXME: utilize the parse errors coming from AceEditor worker, only try to repair then
    if (text.length > MAX_REPAIRABLE_SIZE) {
      debug('checkValidJson: not validating, document too large')
      return
    }

    try {
      // FIXME: instead of parsing the JSON here (which is expensive),
      //  get the parse error from the Ace Editor worker instead
      JSON.parse(text)
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

  $: checkValidJsonDebounced(text)

  $: repairActions = (jsonStatus === JSON_STATUS_REPAIRABLE)
    ? [{
        icon: faWrench,
        text: 'Auto repair',
        title: 'Automatically repair JSON',
        onClick: handleRepair
      }]
    : []
</script>

<div
  class="code-mode"
  on:keydown={handleKeyDown}
  bind:this={domCodeMode}
>
  {#if mainMenuBar}
    <CodeMenu
      readOnly={readOnly}
      onFormat={handleFormat}
      onCompact={handleCompact}
      onSort={handleSort}
      onTransform={handleTransform}
      onUndo={handleUndo}
      onRedo={handleRedo}
      canUndo={canUndo}
      canRedo={canRedo}
      onRenderMenu={onRenderMenu}
    />
  {/if}
  {#if aceEditorDisabled}
    <Message
      icon={faExclamationTriangle}
      type="error"
      message={
        `The JSON document is larger than ${formatSize(MAX_DOCUMENT_SIZE_CODE_MODE, 1024)}, ` +
        `and may crash your browser when loading it in code mode. Actual size: ${formatSize(text.length, 1024)}.`
      }
      actions={[
          {
            text: 'Open anyway',
            title: 'Open the document in code mode',
            onClick: handleAcceptTooLarge
          },
          {
            text: 'Open in tree mode',
            title: 'Open the document in tree mode',
            onClick: onSwitchToTreeMode
          }
        ]}
    />
  {/if}

  <div class="contents" class:visible={!aceEditorDisabled} bind:this={aceEditorRef}></div>

  {#if jsonParseError}
    <Message
      type="error"
      icon={faExclamationTriangle}
      message={jsonParseError}
      actions={repairActions}
    />
  {/if}

  {#if validator}
    <Message
      type="warning"
      icon={faInfoCircle}
      message="This BETA version of code mode doesn't yet have support for JSON Schema or custom validators."
    />
  {/if}
</div>

<style src="./CodeMode.scss"></style>
