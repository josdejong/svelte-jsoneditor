<svelte:options immutable={true} />

<script lang="ts">
  import {
    faExclamationTriangle,
    faEye,
    faTimes,
    faWrench
  } from '@fortawesome/free-solid-svg-icons'
  import { type SyntaxNode, type SyntaxNodeRef, type Tree, type NodeIterator } from '@lezer/common'
  import { createDebug } from '$lib/utils/debug.js'
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { immutableJSONPatch, revertJSONPatch } from 'immutable-json-patch'
  import { jsonrepair } from 'jsonrepair'
  import { debounce, isEqual, uniqueId } from 'lodash-es'
  import { flushSync, onDestroy, onMount } from 'svelte'
  import {
    JSON_STATUS_INVALID,
    JSON_STATUS_REPAIRABLE,
    JSON_STATUS_VALID,
    MAX_CHARACTERS_TEXT_PREVIEW,
    MAX_DOCUMENT_SIZE_TEXT_MODE,
    TEXT_MODE_ONCHANGE_DELAY
  } from '$lib/constants.js'
  import {
    activeElementIsChildOf,
    createNormalizationFunctions,
    getWindow
  } from '$lib/utils/domUtils.js'
  import { formatSize } from '$lib/utils/fileUtils.js'
  import { findTextLocation, getText, needsFormatting } from '$lib/utils/jsonUtils.js'
  import { expandSelf } from '$lib/logic/documentState.js'
  import { createFocusTracker } from '../../controls/createFocusTracker.js'
  import Message from '../../controls/Message.svelte'
  import ValidationErrorsOverview from '../../controls/ValidationErrorsOverview.svelte'
  import TextMenu from './menu/TextMenu.svelte'
  import {
    Annotation,
    ChangeSet,
    Compartment,
    EditorSelection,
    EditorState,
    type Extension
  } from '@codemirror/state'
  import {
    crosshairCursor,
    drawSelection,
    dropCursor,
    EditorView,
    highlightActiveLine,
    highlightActiveLineGutter,
    highlightSpecialChars,
    keymap,
    lineNumbers,
    rectangularSelection,
    type ViewUpdate
  } from '@codemirror/view'
  import { defaultKeymap, indentWithTab } from '@codemirror/commands'
  import type { Diagnostic } from '@codemirror/lint'
  import { linter, lintGutter, lintKeymap } from '@codemirror/lint'
  import { json as jsonLang } from '@codemirror/lang-json'
  import {
    bracketMatching,
    defaultHighlightStyle,
    foldGutter,
    foldKeymap,
    indentOnInput,
    indentUnit,
    syntaxHighlighting,
    foldable,
    foldService,
    ensureSyntaxTree,
    foldEffect,
    unfoldCode,
    unfoldAll,
    foldNodeProp
  } from '@codemirror/language'
  import {
    closeSearchPanel,
    highlightSelectionMatches,
    openSearchPanel,
    search,
    searchKeymap
  } from '@codemirror/search'
  import {
    autocompletion,
    closeBrackets,
    closeBracketsKeymap,
    completionKeymap
  } from '@codemirror/autocomplete'
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  import jsonSourceMap from 'json-source-map'
  import StatusBar from './StatusBar.svelte'
  import { highlighter } from './codemirror/codemirror-theme.js'
  import type {
    Content,
    ContentErrors,
    History,
    HistoryItem,
    JSONEditorSelection,
    JSONParser,
    JSONPatchResult,
    OnBlur,
    OnChange,
    OnChangeMode,
    OnError,
    OnExpand,
    OnFocus,
    OnRedo,
    OnRenderMenuInternal,
    OnSelect,
    OnSortModal,
    OnTransformModal,
    OnUndo,
    ParseError,
    RichValidationError,
    TextHistoryItem,
    TextSelection,
    TransformModalOptions,
    ValidationError,
    Validator
  } from '$lib/types.js'
  import { Mode, SelectionType, ValidationSeverity } from '$lib/types.js'
  import {
    isContentParseError,
    isContentValidationErrors,
    isTextHistoryItem
  } from '$lib/typeguards.js'
  import memoizeOne from 'memoize-one'
  import { validateText } from '$lib/logic/validation.js'
  import { truncate } from '$lib/utils/stringUtils.js'
  import { faJSONEditorFormat } from '$lib/img/customFontawesomeIcons.js'
  import { indentationMarkers } from '@replit/codemirror-indentation-markers'
  import { isTextSelection } from '$lib/logic/selection.js'
  import { wrappedLineIndent } from 'codemirror-wrapped-line-indent/dist/index.js' // ensure loading ESM, otherwise the vitest test fail

  export let readOnly: boolean
  export let mainMenuBar: boolean
  export let statusBar: boolean
  export let askToFormat: boolean
  export let externalContent: Content
  export let externalSelection: JSONEditorSelection | undefined
  export let history: History<HistoryItem>
  export let indentation: number | string
  export let tabSize: number
  export let escapeUnicodeCharacters: boolean
  export let parser: JSONParser
  export let validator: Validator | undefined
  export let validationParser: JSONParser
  export let onChange: OnChange
  export let onChangeMode: OnChangeMode
  export let onSelect: OnSelect
  export let onUndo: OnUndo
  export let onRedo: OnRedo
  export let onError: OnError
  export let onFocus: OnFocus
  export let onBlur: OnBlur
  export let onRenderMenu: OnRenderMenuInternal
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

  let codeMirrorRef: HTMLDivElement
  let domTextMode: HTMLDivElement
  let codeMirrorView: EditorView
  let editorState: EditorState

  let acceptTooLarge = false
  let askToFormatApplied = askToFormat

  let validationErrors: ValidationError[] = []
  const linterCompartment = new Compartment()
  const readOnlyCompartment = new Compartment()
  const indentCompartment = new Compartment()
  const tabSizeCompartment = new Compartment()
  const themeCompartment = new Compartment()

  let content: Content = externalContent
  let text = getText(content, indentation, parser) // text is just a cached version of content.text or parsed content.json

  let historyAnnotation = Annotation.define()

  let historyUpdatesQueue: ViewUpdate[] | null = null

  function addHistoryItem(): boolean {
    if (!historyUpdatesQueue || historyUpdatesQueue.length === 0) {
      return false
    }

    // merge changes and create the inverse changes
    const startState = historyUpdatesQueue[0].startState
    const endState = historyUpdatesQueue[historyUpdatesQueue.length - 1].state
    const mergedChanges = historyUpdatesQueue
      .map((update) => update.changes)
      .reduce((mergedChanges, change) => mergedChanges.compose(change))
    const inverseChanges = mergedChanges.invert(startState.doc)

    // create a history item with undo/redo actions
    const item: TextHistoryItem = {
      type: 'text',
      undo: {
        changes: inverseChanges.toJSON(),
        selection: toTextSelection(startState.selection)
      },
      redo: {
        changes: mergedChanges.toJSON(),
        selection: toTextSelection(endState.selection)
      }
    }

    debug('add history item', item)

    history.add(item)

    historyUpdatesQueue = null
    return true
  }

  $: normalization = createNormalizationFunctions({
    escapeControlCharacters: false,
    escapeUnicodeCharacters
  })

  // eslint-disable-next-line svelte/no-unused-svelte-ignore
  // svelte-ignore reactive_declaration_non_reactive_property
  $: setCodeMirrorContent(externalContent, false, false)
  $: applyExternalSelection(externalSelection)
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
    flush()

    if (codeMirrorView) {
      debug('Destroy CodeMirror editor')
      codeMirrorView.destroy()
    }
  })

  const sortModalId = uniqueId()
  const transformModalId = uniqueId()

  export function focus() {
    if (codeMirrorView) {
      debug('focus')
      codeMirrorView.focus()
    }
  }

  export function collapse(path: JSONPath, recursive: boolean) {
    if (!codeMirrorView) {
      return
    }
    try {
      foldRecursive(path, recursive)
    } catch (err) {
      onError(err as Error)
    }
  }
  // customFoldService CodeMirror foldable syntaxFolding use syntaxTree, Under large json, it will cause the tree to be incomplete
  // so we use ensureSyntaxTree get the full tree
  // https://github.com/codemirror/language/blob/ca8d6bec5463fa17eea0b893e4a2670e4df110d4/src/fold.ts#L31
  function createCustomFoldService() {
    return foldService.of((state, start, end) => {
      const tree = ensureSyntaxTree(state, state.doc.length, Infinity)
      if (!tree || tree.length < end) return null

      let stack = tree.resolveStack(end, 1)
      let found: null | { from: number; to: number } = null

      for (let iter: NodeIterator | null = stack; iter; iter = iter.next) {
        let cur = iter.node
        if (cur.to <= end || cur.from > end) continue
        if (found && cur.from < start) break

        let prop = cur.type.prop(foldNodeProp)
        if (
          prop &&
          (cur.to < tree.length - 50 || tree.length == state.doc.length || !isUnfinished(cur))
        ) {
          let value = prop(cur, state)
          if (value && value.from <= end && value.from >= start && value.to > end) {
            found = value
          }
        }
      }
      return found
    })
  }
  function isUnfinished(node: SyntaxNode) {
    let ch = node.lastChild
    return ch && ch.to == node.to && ch.type.isError
  }

  function getFoldRanges(
    tree: Tree,
    state: EditorState,
    startPos?: number,
    recursive: boolean = true
  ) {
    const foldRanges: { from: number; to: number }[] = []
    const processedRanges = new Set<string>()

    tree.iterate({
      enter(node: SyntaxNodeRef) {
        // If startPos is defined, only consider nodes after it
        if (startPos === undefined || node.from >= startPos) {
          const isFoldable = foldable(state, node.from, node.to)
          if (isFoldable) {
            const rangeKey = `${isFoldable.from}-${isFoldable.to}`

            if (!processedRanges.has(rangeKey)) {
              // If not recursive, only add top-level foldable nodes
              if (!recursive) {
                // Check if this node is not nested inside another foldable node we've already added
                const isNested = foldRanges.some(
                  (range) => range.from <= isFoldable.from && range.to >= isFoldable.to
                )
                if (!isNested) {
                  foldRanges.push({ from: isFoldable.from, to: isFoldable.to })
                  processedRanges.add(rangeKey)
                }
              } else {
                // Recursive mode: add all foldable nodes
                foldRanges.push({ from: isFoldable.from, to: isFoldable.to })
                processedRanges.add(rangeKey)
              }
            }
          }
        }
      }
    })

    return foldRanges
  }

  function foldRecursive(path: JSONPath = [], recursive: boolean = true) {
    const state = codeMirrorView.state
    const docLength = state.doc.length
    const tree = ensureSyntaxTree(state, docLength, Infinity)
    if (!tree) {
      return
    }

    let foldRanges: { from: number; to: number }[] = []
    if (path.length === 0) {
      foldRanges = getFoldRanges(tree, state, undefined, recursive)
    } else {
      // If path is not empty, get the position of the specified path and fold content under it
      const { from: pathStartPos } = findTextLocation(normalization.escapeValue(text), path)
      if (pathStartPos !== undefined && pathStartPos !== 0) {
        foldRanges = getFoldRanges(tree, state, pathStartPos, recursive)
      }
    }

    if (foldRanges.length > 0) {
      codeMirrorView.dispatch({
        effects: foldRanges.map((range) => foldEffect.of({ from: range.from, to: range.to }))
      })
    }
  }

  export function expand(path: JSONPath, callback: OnExpand = expandSelf) {
    if (!codeMirrorView) {
      return
    }

    try {
      if (path && path.length > 0) {
        // Find the text location of the given JSON path
        const { from } = findTextLocation(normalization.escapeValue(text), path)

        if (from !== undefined) {
          // Set selection to the position we want to unfold
          codeMirrorView.dispatch({
            selection: { anchor: from, head: from }
          })
          // Use CodeMirror's unfoldCode command for specific path
          unfoldCode(codeMirrorView)
        }
      } else {
        // When path is empty (expand all)
        unfoldAll(codeMirrorView)
      }
      callback?.(path)
    } catch (err) {
      onError(err as Error)
    }
  }

  // modalOpen is true when one of the modals is open.
  // This is used to track whether the editor still has focus
  let modalOpen = false

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
    return handlePatch(operations, false)
  }

  export function handlePatch(operations: JSONPatchDocument, emitChange: boolean): JSONPatchResult {
    debug('handlePatch', operations, emitChange)

    const previousJson = parser.parse(text)
    const updatedJson = immutableJSONPatch(previousJson, operations)
    const undo = revertJSONPatch(previousJson, operations)
    const updatedContent = {
      text: parser.stringify(updatedJson, null, indentation) as string
    }

    setCodeMirrorContent(updatedContent, emitChange, false)

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
      const updatedJson = parser.parse(text)
      const updatedContent = {
        text: parser.stringify(updatedJson, null, indentation) as string
      }

      setCodeMirrorContent(updatedContent, true, false)

      askToFormatApplied = askToFormat // reset to the original value

      return true
    } catch (err) {
      onError(err as Error)
    }

    return false
  }

  function handleCompact(): boolean {
    debug('compact')

    if (readOnly) {
      return false
    }

    try {
      const updatedJson = parser.parse(text)
      const updatedContent = {
        text: parser.stringify(updatedJson) as string
      }

      setCodeMirrorContent(updatedContent, true, false)

      askToFormatApplied = false

      return true
    } catch (err) {
      onError(err as Error)
    }

    return false
  }

  function handleRepair() {
    debug('repair')

    if (readOnly) {
      return
    }

    try {
      const updatedContent = {
        text: jsonrepair(text)
      }

      setCodeMirrorContent(updatedContent, true, false)

      jsonStatus = JSON_STATUS_VALID
      jsonParseError = undefined
    } catch (err) {
      onError(err as Error)
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
          handlePatch(operations, true)
        },
        onClose: () => {
          modalOpen = false
          focus()
        }
      })
    } catch (err) {
      onError(err as Error)
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
            handlePatch(operations, true)
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
      onError(err as Error)
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

  function handleUndo(): boolean {
    if (readOnly) {
      return false
    }

    // first flush any pending changes
    flush()

    const item = history.undo()
    debug('undo', item)
    if (!isTextHistoryItem(item)) {
      onUndo(item)

      return false
    }

    codeMirrorView.dispatch({
      annotations: historyAnnotation.of('undo'),
      changes: ChangeSet.fromJSON(item.undo.changes),
      selection: EditorSelection.fromJSON(item.undo.selection),
      scrollIntoView: true
    })

    return true
  }

  function handleRedo(): boolean {
    if (readOnly) {
      return false
    }

    // first flush any pending changes
    flush()

    const item = history.redo()
    debug('redo', item)
    if (!isTextHistoryItem(item)) {
      onRedo(item)

      return false
    }

    codeMirrorView.dispatch({
      annotations: historyAnnotation.of('redo'),
      changes: ChangeSet.fromJSON(item.redo.changes),
      selection: EditorSelection.fromJSON(item.redo.selection),
      scrollIntoView: true
    })

    return true
  }

  function handleAcceptTooLarge() {
    acceptTooLarge = true
    setCodeMirrorContent(externalContent, true, true)
  }

  function handleSwitchToTreeMode() {
    onChangeMode(Mode.tree)
  }

  function cancelLoadTooLarge() {
    // copy the latest contents of the text editor again into text
    onChangeCodeMirrorValue()
  }

  function handleSelectValidationError(validationError: ValidationError) {
    debug('select validation error', validationError)

    const { from, to } = toRichValidationError(validationError)
    if (from === undefined || to === undefined) {
      return
    }

    // we take "to" as head, not as anchor, because the scrollIntoView will
    // move to the head, and when a large whole object is selected as a whole,
    // we want to scroll to the start of the object and not the end
    setSelection(from, to)

    focus()
  }

  function handleSelectParseError(parseError: ParseError) {
    debug('select parse error', parseError)

    const richParseError = toRichParseError(parseError, false)
    const from = richParseError.from != null ? richParseError.from : 0
    const to = richParseError.to != null ? richParseError.to : 0

    // we take "to" as head, not as anchor, because the scrollIntoView will
    // move to the head, and when a large whole object is selected as a whole,
    // we want to scroll to the start of the object and not the end
    setSelection(from, to)

    focus()
  }

  function setSelection(anchor: number, head: number) {
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

  function handleDoubleClick(_event: MouseEvent, view: EditorView) {
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

  function createCodeMirrorView({
    target,
    initialText,
    readOnly,
    indentation
  }: {
    target: HTMLDivElement
    initialText: string
    readOnly: boolean
    indentation: number | string
  }): EditorView {
    debug('Create CodeMirror editor', { readOnly, indentation })

    const selection = isValidSelection(externalSelection, initialText)
      ? fromTextSelection(externalSelection)
      : undefined

    const state = EditorState.create({
      doc: initialText,
      selection,
      extensions: [
        keymap.of([indentWithTab, formatCompactKeyBinding]),
        linterCompartment.of(createLinter()),
        lintGutter(),
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        foldGutter(),
        createCustomFoldService(), // custom fold service to handle folding
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          { key: 'Mod-z', run: handleUndo, preventDefault: true },
          { key: 'Mod-y', mac: 'Mod-Shift-z', run: handleRedo, preventDefault: true },
          { key: 'Ctrl-Shift-z', run: handleRedo, preventDefault: true },
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap
        ]),
        highlighter,
        indentationMarkers({ hideFirstIndent: true }),
        EditorView.domEventHandlers({
          dblclick: handleDoubleClick
        }),
        EditorView.updateListener.of((update) => {
          editorState = update.state

          if (update.docChanged) {
            const isCustomHistoryEvent = update.transactions.some(
              (transaction) => !!transaction.annotation(historyAnnotation)
            )

            if (!isCustomHistoryEvent) {
              historyUpdatesQueue = [...(historyUpdatesQueue ?? []), update]
            }

            onChangeCodeMirrorValueDebounced()
          }

          if (update.selectionSet) {
            // note that emitOnSelect is invoked in onChangeCodeMirrorValue too,
            // right after firing onChange. Hence, the else if here, we do not want to fire it twice.
            emitOnSelect()
          }
        }),
        jsonLang(),
        search({
          top: true
        }),
        EditorView.lineWrapping,
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        tabSizeCompartment.of(EditorState.tabSize.of(tabSize)),
        indentCompartment.of(createIndent(indentation)),
        themeCompartment.of(EditorView.theme({}, { dark: hasDarkTheme() }))
      ]
    })

    codeMirrorView = new EditorView({
      state,
      parent: target
    })

    if (selection) {
      // important to do via dispatch, since that is executed on the next tick.
      // Otherwise, the editor is not scrolled down enough when the statusbar is rendered on the next tick
      codeMirrorView.dispatch(
        codeMirrorView.state.update({
          selection: selection.main,
          scrollIntoView: true // FIXME: scrollIntoView also affects scroll of the main page, possibly causing the main page to scroll when jsoneditor has an initial selection
        })
      )
    }

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

  function isValidSelection(selection: JSONEditorSelection | undefined, text: string): boolean {
    if (!isTextSelection(selection)) {
      return false
    }

    return selection.ranges.every((range) => range.anchor < text.length && range.head < text.length)
  }

  function toRichValidationError(validationError: ValidationError): RichValidationError {
    const { path, message, severity } = validationError
    const { line, column, from, to } = findTextLocation(normalization.escapeValue(text), path)

    return {
      path,
      line,
      column,
      from,
      to,
      message,
      severity,
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
          : undefined
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

  function setCodeMirrorContent(newContent: Content, emitChange: boolean, forceUpdate: boolean) {
    const newText = getText(newContent, indentation, parser)
    const isChanged = !isEqual(newContent, content)
    const previousContent = content

    debug('setCodeMirrorContent', { isChanged, emitChange, forceUpdate })

    if (!codeMirrorView || (!isChanged && !forceUpdate)) {
      return
    }

    content = newContent
    text = newText

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

    addHistoryItem()

    if (isChanged && emitChange) {
      emitOnChange(content, previousContent)
    }
  }

  function applyExternalSelection(externalSelection: JSONEditorSelection | undefined) {
    if (!isTextSelection(externalSelection)) {
      return
    }

    const selection = fromTextSelection(externalSelection)
    if (codeMirrorView && selection && (!editorState || !editorState.selection.eq(selection))) {
      debug('applyExternalSelection', selection)

      // note that we cannot clear the selection (we could maybe set the cursor to 0 but that's not really what we want)
      codeMirrorView.dispatch({ selection })
    }
  }

  function fromTextSelection(
    selection: JSONEditorSelection | undefined
  ): EditorSelection | undefined {
    return isTextSelection(selection) ? EditorSelection.fromJSON(selection) : undefined
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
    if (!codeMirrorView) {
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

    addHistoryItem()

    emitOnChange(content, previousContent)

    // We emit OnSelect on the next tick to cater for the case where
    // the user changes the content directly inside the OnChange callback.
    // This change will be dispatched by Svelte on the next tick. Before
    // that tick, emitOnSelect would be fired based on the "old" contents,
    // which may be out of range when the replacement by the user is shorter.
    flushSync()
    emitOnSelect()
  }

  function updateLinter(validator: Validator | undefined) {
    debug('updateLinter', validator)

    if (!codeMirrorView) {
      return
    }

    codeMirrorView.dispatch({
      effects: linterCompartment.reconfigure(createLinter())
    })
  }

  function updateIndentation(indentation: number | string) {
    if (codeMirrorView) {
      debug('updateIndentation', indentation)

      codeMirrorView.dispatch({
        effects: indentCompartment.reconfigure(createIndent(indentation))
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

  function updateReadOnly(readOnly: boolean) {
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
    flushSync()

    if (codeMirrorView) {
      const dark = hasDarkTheme()
      debug('updateTheme', { dark })

      codeMirrorView.dispatch({
        effects: [themeCompartment.reconfigure(EditorView.theme({}, { dark }))]
      })

      // resolve on next tick, when code mirror rendering is updated
      return new Promise((resolve) => setTimeout(resolve))
    }

    return Promise.resolve()
  }

  function createIndent(indentation: number | string): Extension[] {
    const indent = indentUnit.of(
      typeof indentation === 'number' ? ' '.repeat(indentation) : indentation
    )

    // We disable wrappedLineIndent in case of tabs to work around a bug:
    // https://github.com/fauzi9331/codemirror-wrapped-line-indent/issues/2
    return indentation === '\t' ? [indent] : [indent, wrappedLineIndent]
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

  export function flush() {
    onChangeCodeMirrorValueDebounced.flush()
  }

  function emitOnChange(content: Content, previousContent: Content) {
    if (onChange) {
      onChange(content, previousContent, {
        contentErrors: validate(),
        patchResult: undefined
      })
    }
  }

  function emitOnSelect() {
    onSelect(toTextSelection(editorState.selection))
  }

  function toTextSelection(selection: EditorSelection): TextSelection {
    return {
      type: SelectionType.text,
      ...selection.toJSON()
    }
  }

  function disableTextEditor(text: string, acceptTooLarge: boolean): boolean {
    const tooLarge = text ? text.length > MAX_DOCUMENT_SIZE_TEXT_MODE : false
    return tooLarge && !acceptTooLarge
  }

  let jsonStatus = JSON_STATUS_VALID

  let jsonParseError: ParseError | undefined

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

  export function validate(): ContentErrors | undefined {
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
      jsonParseError = undefined
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
      canUndo={history.canUndo}
      canRedo={history.canRedo}
      {onRenderMenu}
    />
  {/if}

  {#if !isSSR}
    {@const editorDisabled = disableTextEditor(text, acceptTooLarge)}

    <div class="jse-contents" class:jse-hidden={editorDisabled} bind:this={codeMirrorRef}></div>

    {#if editorDisabled}
      <Message
        icon={faExclamationTriangle}
        type="error"
        message={`The JSON document is larger than ${formatSize(MAX_DOCUMENT_SIZE_TEXT_MODE)}, ` +
          `and may crash your browser when loading it in text mode. Actual size: ${formatSize(text.length)}.`}
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

      {#if !jsonParseError && askToFormatApplied && needsFormatting(text)}
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
              onClick: () => (askToFormatApplied = false)
            }
          ]}
          onClose={focus}
        />
      {/if}

      <ValidationErrorsOverview {validationErrors} selectError={handleSelectValidationError} />
    {/if}
  {:else}
    <div class="jse-contents">
      <div class="jse-loading-space"></div>
      <div class="jse-loading">loading...</div>
    </div>
  {/if}
</div>

<style src="./TextMode.scss"></style>
