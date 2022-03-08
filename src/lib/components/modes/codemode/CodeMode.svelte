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
  import { linter, lintGutter } from '@codemirror/lint'
  import { json as jsonLang } from '@codemirror/lang-json'
  import { indentUnit } from '@codemirror/language'
  import { highlightStyle } from './codemirror/codemirror-theme.js'
  import { Compartment } from '@codemirror/state'
  import { closeSearchPanel, openSearchPanel } from '@codemirror/search'
  import { redo, redoDepth, undo, undoDepth } from '@codemirror/history'
  import { normalizeJsonParseError } from '../../../utils/jsonUtils.js'
  import { MAX_VALIDATABLE_SIZE } from '../../../constants.js'
  import { measure } from '../../../utils/timeUtils.js'

  export let readOnly = false
  export let mainMenuBar = true
  export let text = ''
  export let indentation = 2
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

  /** @type{ValidationError[]} */
  let validationErrors = []
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
        indentation
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
   * @param {ValidationError} validationError
   **/
  function handleSelectValidationError(validationError) {
    debug('select validation error', validationError)

    const richValidationError = toRichValidationError(validationError)

    // we take "to" as head, not as anchor, because the scrollIntoView will
    // move to the head, and when a large whole object is selected as a whole,
    // we want to scroll to the start of the object and not the end
    setSelection(richValidationError.from, richValidationError.to)

    focus()
  }

  /**
   * @param {ParseError} parseError
   **/
  function handleSelectParseError(parseError) {
    debug('select parse error', parseError)

    const richParseError = toRichParseError(parseError)

    // we take "to" as head, not as anchor, because the scrollIntoView will
    // move to the head, and when a large whole object is selected as a whole,
    // we want to scroll to the start of the object and not the end
    setSelection(richParseError.from, richParseError.to)

    focus()
  }

  /**
   * @param {number} anchor
   * @param {number} head
   **/
  function setSelection(anchor, head) {
    debug('setSelection', { anchor, head })

    if (codeMirrorView) {
      codeMirrorView.dispatch(
        codeMirrorView.state.update({
          selection: { anchor, head },
          scrollIntoView: true
        })
      )
    }
  }

  function createCodeMirrorView({ target, initialText, readOnly, indentation }) {
    debug('Create CodeMirror editor', { readOnly, indentation })

    const state = EditorState.create({
      doc: initialText,
      extensions: [
        linter(
          () => {
            onChangeCodeMirrorValueDebounced.flush()

            return validate()
          },
          { delay: CODE_MODE_ONCHANGE_DELAY }
        ),
        lintGutter(),
        basicSetup,
        highlightStyle,
        keymap.of([indentWithTab, formatCompactKeyBinding]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            onChangeCodeMirrorValueDebounced()
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

  /**
   * @param {ValidationError} validationError
   * @returns {RichValidationError}
   */
  function toRichValidationError(validationError) {
    const { path, message, isChildError } = validationError
    const { line, column, from, to } = findTextLocation(text, path)

    return {
      path,
      isChildError,
      line,
      column,
      from,
      to,
      message,
      severity: 'warning',
      actions: []
    }
  }

  /**
   * @param {ParseError} parseError
   * @param {boolean} isRepairable
   * @returns {RichValidationError}
   */
  function toRichParseError(parseError, isRepairable) {
    const { line, column, position, message } = parseError

    return {
      path: null,
      line,
      column,
      from: position || 0,
      to: position || 0,
      severity: 'error',
      message,
      actions: isRepairable
        ? [
            {
              name: 'Auto repair',
              apply: () => handleRepair()
            }
          ]
        : null
    }
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

  /** @type {ParseError || null} */
  let jsonParseError = null

  /**
   * @returns {Diagnostic[]}
   */
  function validate() {
    debug('validate')
    jsonStatus = JSON_STATUS_VALID
    jsonParseError = null
    validationErrors = []

    if (text.length > MAX_VALIDATABLE_SIZE) {
      return [
        {
          from: 0,
          to: 0,
          message: 'Validation turned off: the document is too large',
          severity: 'info'
        }
      ]
    }

    if (isNewDocument) {
      // new, empty document, do not try to parse
      return []
    }

    try {
      const json = measure(
        () => JSON.parse(text),
        (duration) => debug(`validate: parsed json in ${duration} ms`)
      )

      if (!validator) {
        return []
      }

      validationErrors = measure(
        () => validator(json),
        (duration) => debug(`validate: validated json in ${duration} ms`)
      )

      return validationErrors.map(toRichValidationError)
    } catch (err) {
      const isRepairable = measure(
        () => canAutoRepair(text),
        (duration) => debug(`validate: checked whether repairable in ${duration} ms`)
      )

      jsonParseError = normalizeJsonParseError(text, err.message || err.toString())
      jsonStatus = isRepairable ? JSON_STATUS_REPAIRABLE : JSON_STATUS_INVALID

      return [toRichParseError(jsonParseError, isRepairable)]
    }
  }

  function canAutoRepair(text) {
    if (text.length > MAX_AUTO_REPAIRABLE_SIZE) {
      return false
    }

    try {
      JSON.parse(jsonrepair(text))

      return true
    } catch (err) {
      return false
    }
  }

  function triggerValidation() {
    // a trick to trigger running diagnostics again
    forceUpdateText()
  }

  // we pass unused argument to trigger the editor to update the diagnostics
  $: triggerValidation(validator)

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
        message={jsonParseError.message}
        actions={repairActions}
        onClick={() => handleSelectParseError(jsonParseError)}
      />
    {/if}

    <ValidationErrorsOverview {validationErrors} selectError={handleSelectValidationError} />
  {:else}
    <div class="contents" class:visible={true}>
      <div class="loading-space" />
      <div class="loading">loading...</div>
    </div>
  {/if}
</div>

<style src="./CodeMode.scss"></style>
