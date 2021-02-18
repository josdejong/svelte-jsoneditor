<script>
  import createDebug from 'debug'
  import { immutableJSONPatch, revertJSONPatch } from 'immutable-json-patch'
  import { uniqueId } from 'lodash-es'
  import { getContext, onDestroy, onMount } from 'svelte'
  import {
    SORT_MODAL_OPTIONS,
    TRANSFORM_MODAL_OPTIONS
  } from '../../../constants.js'
  import { activeElementIsChildOf, getWindow } from '../../../utils/domUtils.js'
  import { keyComboFromEvent } from '../../../utils/keyBindings.js'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'
  import SortModal from '../../modals/SortModal.svelte'
  import TransformModal from '../../modals/TransformModal.svelte'
  import CodeMenu from './menu/CodeMenu.svelte'
  import ace from './ace/index.js'

  export let readOnly = false
  export let mainMenuBar = true
  export let text = ''
  export let indentation = 2 // TODO: make indentation configurable
  export let aceTheme = 'ace/theme/jsoneditor' // TODO: make aceTheme configurable
  export let onChange = null
  export let onError
  export let onFocus = () => {}
  export let onBlur = () => {}
  export let onRenderMenu = () => {}

  const debug = createDebug('jsoneditor:CodeMode')

  let aceEditorRef
  let aceEditor
  let aceEditorText
  let domCodeMode

  let onChangeDisabled = false

  $: setAceEditorValue(text)
  $: updateIndentation(indentation)

  onMount(() => {
    aceEditor = createAceEditor ({
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
    debug('Destroy Ace editor')
    aceEditor.destroy()
    aceEditor = null

    if (resizeObserver) {
      resizeObserver.unobserve(aceEditorRef)
      resizeObserver = null
    }
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

  function resize() {
    const force = false
    aceEditor.resize(force)
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

    if (combo === 'Ctrl+\\') {
      event.preventDefault()
      handleFormat()
    }

    if (combo === 'Ctrl+Shift+\\') {
      event.preventDefault()
      handleCompact()
    }
  }

  function createAceEditor ({ target, ace, readOnly, indentation, onChange }) {
    debug('create Ace editor')

    const aceEditor = ace.edit(target)
    const aceSession = aceEditor.getSession()
    aceEditor.$blockScrolling = Infinity
    aceEditor.setTheme(aceTheme)
    aceEditor.setOptions({ readOnly })
    aceEditor.setShowPrintMargin(false)
    aceEditor.setFontSize('13px')
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

  function setAceEditorValue (text) {
    onChangeDisabled = true
    if (aceEditor && text !== aceEditorText) {
      aceEditorText = text
      aceEditor.setValue(text, -1)

      setTimeout(() => updateCanUndoRedo())
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

      setTimeout(() => updateCanUndoRedo())

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

  function emitOnChange () {
    if (onChange) {
      onChange(text)
    }
  }
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
  <div class="contents" bind:this={aceEditorRef}></div>
</div>

<style src="./CodeMode.scss"></style>
