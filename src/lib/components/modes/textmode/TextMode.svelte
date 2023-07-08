<svelte:options immutable={true} />

<script lang="ts">
  import {
    faExclamationTriangle,
    faEye,
    faTimes,
    faWrench
  } from '@fortawesome/free-solid-svg-icons'
  import { createDebug } from '$lib/utils/debug.js'
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { immutableJSONPatch, revertJSONPatch } from 'immutable-json-patch'
  import { jsonrepair } from 'jsonrepair'
  import { debounce, isEqual, uniqueId } from 'lodash-es'
  import { onDestroy, onMount, tick } from 'svelte'
  import {
    JSON_STATUS_INVALID,
    JSON_STATUS_REPAIRABLE,
    JSON_STATUS_VALID,
    MAX_DOCUMENT_SIZE_TEXT_MODE,
    TEXT_MODE_ONCHANGE_DELAY
  } from '$lib/constants.js'
  import {
    activeElementIsChildOf,
    createNormalizationFunctions,
    getWindow
  } from '$lib/utils/domUtils.js'
  import { formatSize } from '$lib/utils/fileUtils.js'
  import { findTextLocation, getText } from '$lib/utils/jsonUtils.js'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'
  import Message from '../../controls/Message.svelte'
  import ValidationErrorsOverview from '../../controls/ValidationErrorsOverview.svelte'
  import TextMenu from './menu/TextMenu.svelte'
  import { basicSetup, EditorView } from 'codemirror'
  import { Compartment, EditorState, type Extension } from '@codemirror/state'
  import { keymap, ViewUpdate } from '@codemirror/view'
  import { indentWithTab, redo, redoDepth, undo, undoDepth } from '@codemirror/commands'
  import type { Diagnostic } from '@codemirror/lint'
  import { linter, lintGutter } from '@codemirror/lint'
  import { json as jsonLang } from '@codemirror/lang-json'
  import { indentUnit } from '@codemirror/language'
  import { closeSearchPanel, openSearchPanel, search } from '@codemirror/search'
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  import jsonSourceMap from 'json-source-map'
  import StatusBar from './StatusBar.svelte'
  import { highlighter } from './codemirror/codemirror-theme.js'
  import type {
    Content,
    ContentErrors,
    JSONParser,
    JSONPatchResult,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnError,
    OnFocus,
    OnRenderMenuWithoutContext,
    OnSortModal,
    OnTransformModal,
    ParseError,
    RichValidationError,
    TransformModalOptions,
    ValidationError,
    Validator
  } from '$lib/types.js'
  import { Mode, ValidationSeverity } from '$lib/types.js'
  import { isContentParseError, isContentValidationErrors } from '$lib/typeguards.js'
  import memoizeOne from 'memoize-one'
  import { validateText } from '$lib/logic/validation.js'
  import { MAX_CHARACTERS_TEXT_PREVIEW } from '$lib/constants.js'
  import { truncate } from '$lib/utils/stringUtils.js'
  import { needsFormatting } from '$lib/utils/jsonUtils.js'
  import { faJSONEditorFormat } from '$lib/img/customFontawesomeIcons.js'
  import { indentationMarkers } from '@replit/codemirror-indentation-markers'

  export let readOnly: boolean
  export let mainMenuBar: boolean
  export let statusBar: boolean
  export let askToFormat: boolean
  export let externalContent: Content
  export let indentation: number | string
  export let tabSize: number
  export let escapeUnicodeCharacters: boolean
  export let parser: JSONParser
  export let validator: Validator | null
  export let validationParser: JSONParser
  export let onChange: OnChange
  export let onChangeMode: OnChangeMode
  export let onError: OnError
  export let onFocus: OnFocus
  export let onBlur: OnBlur
  export let onRenderMenu: OnRenderMenuWithoutContext
  export let onSortModal: OnSortModal
  export let onTransformModal: OnTransformModal

  const debug = createDebug('jsoneditor:TextMode')

  const formatCompactKeyBinding = {
    key: 'Mod-i',
    run: handleFormat,
    shift: handleCompact,
    preventDefault: true
  }

  const isSSR = typeof window === 'undefined'
  debug('isSSR:', isSSR)

  let codeMirrorRef
  let codeMirrorView
  let domTextMode
  let editorState: EditorState

  let onChangeDisabled = false
  let acceptTooLarge = false

  let validationErrors: ValidationError[] = []
  const linterCompartment = new Compartment()
  const readOnlyCompartment = new Compartment()
  const indentUnitCompartment = new Compartment()
  const tabSizeCompartment = new Compartment()
  const themeCompartment = new Compartment()

  let content: Content = externalContent
  let text = getText(content, indentation, parser) // text is just a cached version of content.text or parsed content.json

  $: normalization = createNormalizationFunctions({
    escapeControlCharacters: false,
    escapeUnicodeCharacters
  })

  $: setCodeMirrorContent(externalContent)
  $: updateLinter(validator)
  $: updateIndentation(indentation)
  $: updateTabSize(tabSize)
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
        initialText: !disableTextEditor(text, acceptTooLarge)
          ? normalization.escapeValue(text)
          : '',
        readOnly,
        indentation
      })
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

  onDestroy(() => {
    flush()
  })

  createFocusTracker({
    onMount,
    onDestroy,
    getWindow: () => getWindow(domTextMode),
    hasFocus: () => (modalOpen && document.hasFocus()) || activeElementIsChildOf(domTextMode),
    onFocus,
    onBlur: () => {
      flush()
      onBlur()
    }
  })

  export function patch(operations: JSONPatchDocument): JSONPatchResult {
    debug('patch', operations)

    const previousJson = parser.parse(text)
    const updatedJson = immutableJSONPatch(previousJson, operations)
    const undo = revertJSONPatch(previousJson, operations)
    setCodeMirrorContent({
      text: parser.stringify(updatedJson, null, indentation)
    })

    return {
      json: updatedJson,
      previousJson,
      undo,
      redo: operations
    }
  }

  function handleFormat(): boolean {
    debug('format')

    if (readOnly) {
      return false
    }

    try {
      const json = parser.parse(text)
      setCodeMirrorContent({
        text: parser.stringify(json, null, indentation)
      })
      askToFormat = true

      return true
    } catch (err) {
      onError(err)
    }

    return false
  }

  function handleCompact(): boolean {
    debug('compact')

    if (readOnly) {
      return false
    }

    try {
      const json = parser.parse(text)
      setCodeMirrorContent({
        text: parser.stringify(json)
      })
      askToFormat = false

      return true
    } catch (err) {
      onError(err)
    }

    return false
  }

  function handleRepair() {
    debug('repair')

    if (readOnly) {
      return
    }

    try {
      setCodeMirrorContent({
        text: jsonrepair(text)
      })
      jsonStatus = JSON_STATUS_VALID
      jsonParseError = null
    } catch (err) {
      onError(err)
    }
  }

  function handleSort() {
    if (readOnly) {
      return
    }

    try {
      const json = parser.parse(text)

      modalOpen = true

      onSortModal({
        id: sortModalId,
        json,
        rootPath: [],
        onSort: async ({ operations }) => {
          debug('onSort', operations)
          patch(operations)
        },
        onClose: () => {
          modalOpen = false
          focus()
        }
      })
    } catch (err) {
      onError(err)
    }
  }

  /**
   * This method is exposed via JSONEditor.transform
   */
  export function openTransformModal({
    id,
    rootPath,
    onTransform,
    onClose
  }: TransformModalOptions) {
    try {
      const json = parser.parse(text)

      modalOpen = true

      onTransformModal({
        id: id || transformModalId,
        json,
        rootPath: rootPath || [],
        onTransform: (operations) => {
          if (onTransform) {
            onTransform({
              operations,
              json,
              transformedJson: immutableJSONPatch(json, operations)
            })
          } else {
            debug('onTransform', operations)
            patch(operations)
          }
        },
        onClose: () => {
          modalOpen = false
          focus()
          if (onClose) {
            onClose()
          }
        }
      })
    } catch (err) {
      onError(err)
    }
  }

  function handleTransform() {
    if (readOnly) {
      return
    }

    openTransformModal({
      rootPath: []
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
    if (readOnly) {
      return
    }

    if (codeMirrorView) {
      undo(codeMirrorView)
      focus()
    }
  }

  function handleRedo() {
    if (readOnly) {
      return
    }

    if (codeMirrorView) {
      redo(codeMirrorView)
      focus()
    }
  }

  function handleAcceptTooLarge() {
    acceptTooLarge = true
    setCodeMirrorContent(externalContent, true)
  }

  function handleSwitchToTreeMode() {
    onChangeMode(Mode.tree)
  }

  function cancelLoadTooLarge() {
    // copy the latest contents of the text editor again into text
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

  function handleSelectParseError(parseError: ParseError) {
    debug('select parse error', parseError)

    const richParseError = toRichParseError(parseError, false)

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

  function handleDoubleClick(event, view) {
    // When the user double-clicked right from a bracket [ or {,
    // select the contents of the array or object
    if (view.state.selection.ranges.length === 1) {
      const range = view.state.selection.ranges[0]
      const selectedText = text.slice(range.from, range.to)
      if (selectedText === '{' || selectedText === '[') {
        const jsmap = jsonSourceMap.parse(text)
        const path = Object.keys(jsmap.pointers).find((path) => {
          const pointer = jsmap.pointers[path]
          return pointer.value?.pos === range.from
        })
        const pointer = jsmap.pointers[path]

        if (path && pointer && pointer.value && pointer.valueEnd) {
          debug('pointer found, selecting inner contents of path:', path, pointer)
          const anchor = pointer.value.pos + 1
          const head = pointer.valueEnd.pos - 1
          setSelection(anchor, head)
        }
      }
    }
  }

  function createLinter() {
    return linter(linterCallback, { delay: TEXT_MODE_ONCHANGE_DELAY })
  }

  function createCodeMirrorView({ target, initialText, readOnly, indentation }) {
    debug('Create CodeMirror editor', { readOnly, indentation })

    const state = EditorState.create({
      doc: initialText,
      extensions: [
        keymap.of([indentWithTab, formatCompactKeyBinding]),
        linterCompartment.of(createLinter()),
        lintGutter(),
        basicSetup,
        highlighter,
        indentationMarkers({ hideFirstIndent: true }),
        EditorView.domEventHandlers({
          dblclick: handleDoubleClick
        }),
        EditorView.updateListener.of((update: ViewUpdate) => {
          editorState = update.state

          if (update.docChanged) {
            onChangeCodeMirrorValueDebounced()
          }
        }),
        jsonLang(),
        search({
          top: true
        }),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        tabSizeCompartment.of(EditorState.tabSize.of(tabSize)),
        indentUnitCompartment.of(createIndentUnit(indentation)),
        themeCompartment.of(EditorView.theme({}, { dark: hasDarkTheme() })),
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

  function hasDarkTheme() {
    return codeMirrorRef
      ? getComputedStyle(codeMirrorRef).getPropertyValue('--jse-theme').includes('dark')
      : false
  }

  function toRichValidationError(validationError: ValidationError): RichValidationError {
    const { path, message } = validationError
    const { line, column, from, to } = findTextLocation(normalization.escapeValue(text), path)

    return {
      path,
      line,
      column,
      from,
      to,
      message,
      severity: ValidationSeverity.warning,
      actions: []
    }
  }

  function toRichParseError(parseError: ParseError, isRepairable: boolean): RichValidationError {
    const { line, column, position, message } = parseError

    return {
      path: [] as JSONPath,
      line,
      column,
      from: position,
      to: position,
      severity: ValidationSeverity.error,
      message,
      actions:
        isRepairable && !readOnly
          ? [
              {
                name: 'Auto repair',
                apply: () => handleRepair()
              }
            ]
          : null
    }
  }

  function toDiagnostic(error: RichValidationError): Diagnostic {
    return {
      from: error.from || 0,
      to: error.to || 0,
      message: error.message || '',
      actions: error.actions as Diagnostic['actions'],
      severity: error.severity
    }
  }

  function setCodeMirrorContent(newContent: Content, forceUpdate = false) {
    const newText = getText(newContent, indentation, parser)
    const isChanged = !isEqual(newContent, content)
    const previousContent = content
    content = newContent
    text = newText

    debug('setCodeMirrorContent', { isChanged, forceUpdate })

    if (!codeMirrorView || (!isChanged && !forceUpdate)) {
      return
    }

    if (!disableTextEditor(text, acceptTooLarge)) {
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

    updateCanUndoRedo()
    if (isChanged) {
      emitOnChange(content, previousContent)
    }
  }

  /**
   * Force refreshing the editor, for example after changing the font size
   * to update the positioning of the line numbers in the gutter
   */
  export async function refresh(): Promise<void> {
    debug('refresh')

    // update the theme (light/dark), but also, as a side effect,
    // refresh the font size of the line numbers in the gutter
    await updateTheme()
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

    const codeMirrorText = getCodeMirrorValue()

    const isChanged = codeMirrorText !== text
    debug('onChangeCodeMirrorValue', { isChanged })
    if (!isChanged) {
      return
    }

    const previousContent = content
    text = codeMirrorText
    content = { text }

    updateCanUndoRedo()
    emitOnChange(content, previousContent)
  }

  function updateLinter(validator) {
    debug('updateLinter', validator)

    if (!codeMirrorView) {
      return
    }

    codeMirrorView.dispatch({
      effects: linterCompartment.reconfigure(createLinter())
    })
  }

  function updateIndentation(indentation) {
    if (codeMirrorView) {
      debug('updateIndentation', indentation)

      codeMirrorView.dispatch({
        effects: indentUnitCompartment.reconfigure(createIndentUnit(indentation))
      })
    }
  }

  function updateTabSize(tabSize: number) {
    if (codeMirrorView) {
      debug('updateTabSize', tabSize)

      codeMirrorView.dispatch({
        effects: tabSizeCompartment.reconfigure(EditorState.tabSize.of(tabSize))
      })
    }
  }

  function updateReadOnly(readOnly) {
    if (codeMirrorView) {
      debug('updateReadOnly', readOnly)

      codeMirrorView.dispatch({
        effects: [readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly))]
      })
    }
  }

  async function updateTheme(): Promise<void> {
    // we check the theme on the next tick, to make sure the page
    // is re-rendered with (possibly) changed CSS variables
    await tick()

    if (codeMirrorView) {
      const dark = hasDarkTheme()
      debug('updateTheme', { dark })

      codeMirrorView.dispatch({
        effects: [themeCompartment.reconfigure(EditorView.theme({}, { dark }))]
      })
    }
  }

  function createIndentUnit(indentation: number | string): Extension {
    return indentUnit.of(typeof indentation === 'number' ? ' '.repeat(indentation) : indentation)
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
    TEXT_MODE_ONCHANGE_DELAY
  )

  function flush() {
    onChangeCodeMirrorValueDebounced.flush()
  }

  function emitOnChange(content: Content, previousContent: Content) {
    if (onChange) {
      onChange(content, previousContent, {
        contentErrors: validate(),
        patchResult: null
      })
    }
  }

  function disableTextEditor(text: string, acceptTooLarge: boolean): boolean {
    const tooLarge = text ? text.length > MAX_DOCUMENT_SIZE_TEXT_MODE : false
    return tooLarge && !acceptTooLarge
  }

  let jsonStatus = JSON_STATUS_VALID

  let jsonParseError: ParseError | null = null

  function linterCallback(): Diagnostic[] {
    if (disableTextEditor(text, acceptTooLarge)) {
      return []
    }

    const contentErrors = validate()

    if (isContentParseError(contentErrors)) {
      const { parseError, isRepairable } = contentErrors

      return [toDiagnostic(toRichParseError(parseError, isRepairable))]
    }

    if (isContentValidationErrors(contentErrors)) {
      return contentErrors.validationErrors.map(toRichValidationError).map(toDiagnostic)
    }

    return []
  }

  export function validate(): ContentErrors | null {
    debug('validate:start')

    flush()

    const contentErrors = memoizedValidateText(
      normalization.escapeValue(text),
      validator,
      parser,
      validationParser
    )

    if (isContentParseError(contentErrors)) {
      jsonStatus = contentErrors.isRepairable ? JSON_STATUS_REPAIRABLE : JSON_STATUS_INVALID
      jsonParseError = contentErrors.parseError
      validationErrors = []
    } else {
      jsonStatus = JSON_STATUS_VALID
      jsonParseError = null
      validationErrors = contentErrors?.validationErrors || []
    }

    debug('validate:end')

    return contentErrors
  }

  // because onChange returns the validation errors and there is also a separate listener,
  // we would execute validation twice. Memoizing the last result solves this.
  const memoizedValidateText = memoizeOne(validateText)

  function handleShowMe() {
    if (jsonParseError) {
      handleSelectParseError(jsonParseError)
    }
  }

  const repairActionShowMe = {
    icon: faEye,
    text: 'Show me',
    title: 'Move to the parse error location',
    onClick: handleShowMe
  }

  $: repairActions =
    jsonStatus === JSON_STATUS_REPAIRABLE && !readOnly
      ? [
          {
            icon: faWrench,
            text: 'Auto repair',
            title: 'Automatically repair JSON',
            onClick: handleRepair
          },
          repairActionShowMe
        ]
      : [repairActionShowMe]
</script>

<div class="jse-text-mode" class:no-main-menu={!mainMenuBar} bind:this={domTextMode}>
  {#if mainMenuBar}
    {@const isNewDocument = text.length === 0}

    <TextMenu
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
    {@const editorDisabled = disableTextEditor(text, acceptTooLarge)}

    <div class="jse-contents" class:jse-hidden={editorDisabled} bind:this={codeMirrorRef} />

    {#if editorDisabled}
      <Message
        icon={faExclamationTriangle}
        type="error"
        message={`The JSON document is larger than ${formatSize(
          MAX_DOCUMENT_SIZE_TEXT_MODE,
          1024
        )}, ` +
          `and may crash your browser when loading it in text mode. Actual size: ${formatSize(
            text.length,
            1024
          )}.`}
        actions={[
          {
            text: 'Open anyway',
            title: 'Open the document in text mode. This may freeze or crash your browser.',
            onClick: handleAcceptTooLarge
          },
          {
            text: 'Open in tree mode',
            title: 'Open the document in tree mode. Tree mode can handle large documents.',
            onClick: handleSwitchToTreeMode
          },
          {
            text: 'Cancel',
            title: 'Cancel opening this large document.',
            onClick: cancelLoadTooLarge
          }
        ]}
        onClose={focus}
      />

      <div class="jse-contents jse-preview">
        {truncate(text || '', MAX_CHARACTERS_TEXT_PREVIEW)}
      </div>
    {/if}

    {#if !editorDisabled}
      {#if statusBar}
        <StatusBar {editorState} />
      {/if}

      {#if jsonParseError}
        <Message
          type="error"
          icon={faExclamationTriangle}
          message={jsonParseError.message}
          actions={repairActions}
          onClick={handleShowMe}
          onClose={focus}
        />
      {/if}

      {#if !jsonParseError && askToFormat && needsFormatting(text)}
        <Message
          type="success"
          message="Do you want to format the JSON?"
          actions={[
            {
              icon: faJSONEditorFormat,
              text: 'Format',
              title: 'Format JSON: add proper indentation and new lines (Ctrl+I)',
              onClick: handleFormat
            },
            {
              icon: faTimes,
              text: 'No thanks',
              title: 'Close this message',
              onClick: () => (askToFormat = false)
            }
          ]}
          onClose={focus}
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

<style src="./TextMode.scss"></style>
