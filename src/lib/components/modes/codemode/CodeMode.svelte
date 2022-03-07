<svelte:options immutable={true} />

<script>
  import { faExclamationTriangle, faWrench } from '@fortawesome/free-solid-svg-icons'
  import { createDebug } from '$lib/utils/debug'
  import { immutableJSONPatch, revertJSONPatch } from 'immutable-json-patch'
  import jsonrepair from 'jsonrepair'
  import { debounce, uniqueId } from 'lodash-es'
  import { getContext, onDestroy, onMount } from 'svelte'
  import {
    CODE_MODE_ONCHANGE_DELAY,
    JSON_STATUS_INVALID,
    JSON_STATUS_REPAIRABLE,
    JSON_STATUS_VALID,
    MAX_AUTO_REPAIRABLE_SIZE,
    MAX_DOCUMENT_SIZE_CODE_MODE,
    SORT_MODAL_OPTIONS,
    TRANSFORM_MODAL_OPTIONS
  } from '$lib/constants'
  import {
    activeElementIsChildOf,
    createNormalizationFunctions,
    getWindow
  } from '$lib/utils/domUtils'
  import { formatSize } from '$lib/utils/fileUtils'
  import { findTextLocation } from '$lib/utils/jsonUtils'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'
  import Message from '../../controls/Message.svelte'
  import ValidationErrorsOverview from '../../controls/ValidationErrorsOverview.svelte'
  import SortModal from '../../modals/SortModal.svelte'
  import TransformModal from '../../modals/TransformModal.svelte'
  import CodeMenu from './menu/CodeMenu.svelte'
  import { basicSetup, EditorState } from '@codemirror/basic-setup'
  import { EditorView, keymap } from '@codemirror/view'
  import { indentWithTab } from '@codemirror/commands'
  import { json as jsonLang } from '@codemirror/lang-json'
  import { indentUnit } from '@codemirror/language'
  import { highlightStyle } from '$lib/components/modes/codemode/codemirror/codemirror-theme.js'
  import { Compartment } from '@codemirror/state'
  import { closeSearchPanel, openSearchPanel } from '@codemirror/search'
  import { redo, redoDepth, undo, undoDepth } from '@codemirror/history'

  export let readOnly = false
  export let mainMenuBar = true
  export let text = ''
  export let indentation = 2 // TODO: make indentation configurable
  export let escapeUnicodeCharacters = false
  export let validator = null

  /** @type {((text: string, previousText: string) => void) | null} */
  export let onChange = null

  /** @type {QueryLanguage[]} */
  export let queryLanguages

  /** @type {string} */
  export let queryLanguageId

  /** @type {(queryLanguageId: string) => void} */
  export let onChangeQueryLanguage

  export let onSwitchToTreeMode = () => {}
  export let onError
  export let onFocus = () => {}
  export let onBlur = () => {}
  export let onRenderMenu = () => {}

  const debug = createDebug('jsoneditor:CodeMode')

  const formatCompactKeyBinding = {
    key: 'Mod+I',
    run: handleFormat,
    shift: handleCompact
  }

  const isSSR = typeof window === 'undefined'
  debug('isSSR:', isSSR)

  let codeMirrorRef
  let codeMirrorView
  let codeMirrorText
  let domCodeMode

  let onChangeDisabled = false
  let acceptTooLarge = false

  let validationErrorsList = []
  const readOnlyCompartment = new Compartment()
  const indentUnitCompartment = new Compartment()

  $: isNewDocument = text.length === 0
  $: tooLarge = text && text.length > MAX_DOCUMENT_SIZE_CODE_MODE
  $: codeEditorDisabled = tooLarge && !acceptTooLarge

  $: normalization = createNormalizationFunctions({
    escapeControlCharacters: false,
    escapeUnicodeCharacters
  })

  $: setCodeMirrorValue(text)
  $: updateIndentation(indentation)
  $: updateReadOnly(readOnly)

  // force updating the text when escapeUnicodeCharacters changes
  let previousEscapeUnicodeCharacters = escapeUnicodeCharacters
  $: {
    if (previousEscapeUnicodeCharacters !== escapeUnicodeCharacters) {
      previousEscapeUnicodeCharacters = escapeUnicodeCharacters
      forceUpdateText()
    }
  }

  onMount(async () => {
    if (isSSR) {
      return
    }

    try {
      codeMirrorView = createCodeMirrorView({
        target: codeMirrorRef,
        initialText: text,
        readOnly,
        indentation,
        onChange: onChangeCodeMirrorValueDebounced
      })

      focus()
    } catch (err) {
      // TODO: report error to the user
      console.error(err)
    }
  })

  onDestroy(() => {
    if (codeMirrorView) {
      debug('Destroy CodeMirror editor')
      codeMirrorView.destroy()
    }
  })

  let canUndo = false
  let canRedo = false

  const { open } = getContext('simple-modal')
  const sortModalId = uniqueId()
  const transformModalId = uniqueId()

  export function focus() {
    if (codeMirrorView) {
      debug('focus')
      codeMirrorView.focus()
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
   * @return {JSONPatchResult}
   */
  export function patch(operations) {
    debug('patch', operations)

    const previousText = text
    const previousJson = JSON.parse(text)
    const updatedJson = immutableJSONPatch(previousJson, operations)
    const undo = revertJSONPatch(previousJson, operations)
    text = JSON.stringify(updatedJson, null, indentation)

    if (text !== previousText) {
      emitOnChange(text, previousText)
    }

    return {
      json: updatedJson,
      previousJson,
      undo,
      redo: operations
    }
  }

  function handleFormat() {
    debug('format')
    try {
      const previousText = text
      const json = JSON.parse(text)
      text = JSON.stringify(json, null, indentation)

      if (text !== previousText) {
        emitOnChange(text, previousText)
      }
    } catch (err) {
      onError(err)
    }
  }

  function handleCompact() {
    debug('compact')
    try {
      const previousText = text
      const json = JSON.parse(text)
      text = JSON.stringify(json)

      if (text !== previousText) {
        emitOnChange(text, previousText)
      }
    } catch (err) {
      onError(err)
    }
  }

  function handleRepair() {
    debug('repair')
    try {
      const previousText = text
      text = jsonrepair(text)
      jsonStatus = JSON_STATUS_VALID
      jsonParseError = undefined

      if (text !== previousText) {
        emitOnChange(text, previousText)
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
          queryLanguages,
          queryLanguageId,
          onChangeQueryLanguage,
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
    if (codeMirrorView) {
      // TODO: figure out the proper way to detect whether the search panel is open
      if (codeMirrorRef && codeMirrorRef.querySelector('.cm-search')) {
        closeSearchPanel(codeMirrorView)
      } else {
        openSearchPanel(codeMirrorView)
      }
    }
  }

  function handleUndo() {
    if (codeMirrorView) {
      undo(codeMirrorView)
      focus()
    }
  }

  function handleRedo() {
    if (codeMirrorView) {
      redo(codeMirrorView)
      focus()
    }
  }

  function handleAcceptTooLarge() {
    acceptTooLarge = true
    setCodeMirrorValue(text, true)
  }

  function cancelLoadTooLarge() {
    // copy the latest contents of the code editor again into text
    onChangeCodeMirrorValue()
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
    // FIXME: implement setSelection for CodeMirror
    // if (aceEditor) {
    //   aceEditor.selection.setRange({ start, end })
    //   aceEditor.scrollToLine(start.row, true)
    // }
  }

  function createCodeMirrorView({ target, initialText, readOnly, indentation, onChange }) {
    debug('Create CodeMirror editor', { readOnly, indentation })

    // FIXME: implement markers for JSON Schema errors and parse errors

    const state = EditorState.create({
      doc: initialText,
      extensions: [
        basicSetup,
        highlightStyle,
        keymap.of([indentWithTab, formatCompactKeyBinding]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChange()
          }
        }),
        jsonLang(),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        indentUnitCompartment.of(createIndentUnit(indentation)),
        EditorView.lineWrapping
      ]
    })

    codeMirrorView = new EditorView({
      state,
      parent: target
    })

    return codeMirrorView
  }

  function getCodeMirrorValue() {
    return codeMirrorView ? normalization.unescapeValue(codeMirrorView.state.doc.toString()) : ''
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
   * validation annotations are handled by this mode
   * therefore in order to refresh we send only the annotations of error type in order to maintain its state
   * @private
   */
  function refreshAnnotations() {
    // FIXME: implement refreshAnnotations for CodeMirror
    debug('refresh annotations')
    // const session = aceEditor && aceEditor.getSession()
    // if (session) {
    //   const errorAnnotations = session
    //     .getAnnotations()
    //     .filter((annotation) => annotation.type === 'error')
    //
    //   session.setAnnotations(errorAnnotations)
    // }
  }

  function setCodeMirrorValue(text, force = false) {
    if (codeEditorDisabled && !force) {
      debug('not applying text: editor is disabled')
      return
    }

    if (codeMirrorView && text !== codeMirrorText) {
      debug('setCodeMirrorValue')

      codeMirrorText = text

      // keep state
      // to reset state: codeMirrorView.setState(EditorState.create({doc: text, extensions: ...}))
      codeMirrorView.dispatch({
        changes: {
          from: 0,
          to: codeMirrorView.state.doc.length,
          insert: normalization.escapeValue(text)
        }
      })
    }
  }

  function forceUpdateText() {
    debug('forceUpdateText', { escapeUnicodeCharacters })

    if (codeMirrorView) {
      codeMirrorView.dispatch({
        changes: {
          from: 0,
          to: codeMirrorView.state.doc.length,
          insert: normalization.escapeValue(text)
        }
      })
    }
  }

  function onChangeCodeMirrorValue() {
    if (onChangeDisabled || !codeMirrorView) {
      return
    }

    codeMirrorText = getCodeMirrorValue()
    if (codeMirrorText !== text) {
      const previousText = codeMirrorText

      debug('text changed')
      text = codeMirrorText

      updateCanUndoRedo()

      emitOnChange(text, previousText)
    }
  }

  function updateIndentation(indentation) {
    if (codeMirrorView) {
      debug('updateIndentation', indentation)

      codeMirrorView.dispatch({
        effects: indentUnitCompartment.reconfigure(createIndentUnit(indentation))
      })
    }
  }

  function updateReadOnly(readOnly) {
    if (codeMirrorView) {
      debug('updateReadOnly', readOnly)

      codeMirrorView.dispatch({
        effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly))
      })
    }
  }

  /**
   * @param {number} indentation
   * @returns {Extension}
   */
  function createIndentUnit(indentation) {
    return indentUnit.of(' '.repeat(indentation))
  }

  function updateCanUndoRedo() {
    canUndo = undoDepth(codeMirrorView.state) > 0
    canRedo = redoDepth(codeMirrorView.state) > 0

    debug({ canUndo, canRedo })
  }

  // debounce the input: when pressing Enter at the end of a line, two change
  // events are fired: one with the new Return character, and a second with
  // indentation added on the new line. This causes a race condition when used
  // for example in React. Debouncing the onChange events also results in not
  // firing a change event with every character that a user types, but only as
  // soon as the user stops typing.
  const onChangeCodeMirrorValueDebounced = debounce(
    onChangeCodeMirrorValue,
    CODE_MODE_ONCHANGE_DELAY
  )

  /**
   * @param {string} text
   * @param {string} previousText
   */
  function emitOnChange(text, previousText) {
    if (onChange) {
      onChange(text, previousText)
    }
  }

  let jsonStatus = JSON_STATUS_VALID
  let jsonParseError

  function checkValidJson() {
    jsonStatus = JSON_STATUS_VALID
    jsonParseError = undefined
    validationErrorsList = []

    if (text.length > MAX_AUTO_REPAIRABLE_SIZE) {
      debug('checkValidJson: not validating, document too large')
      return
    }

    if (isNewDocument) {
      // new, empty document, do not try to parse
      return
    }

    try {
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

  // we pass unused arguments to trigger calling checkValidJson when text or validator changes
  // TODO: find a better solution
  $: checkValidJson(text)
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

<div class="code-mode" bind:this={domCodeMode}>
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
    {#if codeEditorDisabled}
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

    <div class="contents" class:visible={!codeEditorDisabled} bind:this={codeMirrorRef} />

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
