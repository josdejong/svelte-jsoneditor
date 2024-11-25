<svelte:options immutable={true} />

<script lang="ts">
  import { onMount, tick } from 'svelte'
  import Header from './Header.svelte'
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { compileJSONPointer, immutableJSONPatch, isJSONArray } from 'immutable-json-patch'
  import { createDebug } from '$lib/utils/debug.js'
  import type {
    Content,
    JSONEditorModalCallback,
    JSONEditorSelection,
    JSONParser,
    JSONPathParser,
    OnClassName,
    OnPatch,
    OnRenderContextMenu,
    OnRenderMenu,
    OnRenderValue,
    OnSortModal,
    OnTransformModal,
    Validator
  } from '$lib/types'
  import { Mode } from '$lib/types.js'
  import JSONEditorRoot from '../modes/JSONEditorRoot.svelte'
  import { noop } from '$lib/utils/noop.js'
  import { stringifyJSONPath } from '$lib/utils/pathUtils.js'
  import { initial, isEmpty, last } from 'lodash-es'
  import { isJSONContent, toJSONContent } from '$lib/utils/jsonUtils.js'
  import Icon from 'svelte-awesome'
  import { faCaretLeft } from '@fortawesome/free-solid-svg-icons'
  import memoizeOne from 'memoize-one'
  import { getFocusPath, isJSONSelection } from '$lib/logic/selection.js'
  import Modal from './Modal.svelte'
  import AbsolutePopup from './popup/AbsolutePopup.svelte'

  const debug = createDebug('jsoneditor:JSONEditorModal')

  export let content: Content // the nested document
  export let path: JSONPath
  export let onPatch: OnPatch

  export let readOnly: boolean
  export let indentation: number | string
  export let tabSize: number
  export let mainMenuBar: boolean
  export let navigationBar: boolean
  export let statusBar: boolean
  export let askToFormat: boolean
  export let escapeControlCharacters: boolean
  export let escapeUnicodeCharacters: boolean
  export let flattenColumns: boolean
  export let parser: JSONParser
  export let validator: Validator | undefined
  export let validationParser: JSONParser
  export let pathParser: JSONPathParser

  export let onRenderValue: OnRenderValue
  export let onClassName: OnClassName
  export let onRenderMenu: OnRenderMenu
  export let onRenderContextMenu: OnRenderContextMenu

  export let onSortModal: OnSortModal
  export let onTransformModal: OnTransformModal

  export let onClose: () => void

  interface ModalState {
    mode: Mode
    content: Content
    selection: JSONEditorSelection | undefined
    relativePath: JSONPath
  }

  let refEditor: JSONEditorRoot
  let fullscreen: boolean

  const rootState: ModalState = {
    mode: determineMode(content),
    content,
    selection: undefined,
    relativePath: path
  }
  let stack: ModalState[] = [rootState]

  $: currentState = last(stack) || rootState
  $: absolutePath = stack.flatMap((state) => state.relativePath)
  $: pathDescription = !isEmpty(absolutePath) ? stringifyJSONPath(absolutePath) : '(document root)'

  // not relevant in this Modal setting, but well
  $: parseMemoizeOne = memoizeOne(parser.parse)

  let error: string | undefined = undefined

  onMount(() => {
    refEditor?.focus()
  })

  function determineMode(content: Content): Mode {
    return isJSONContent(content) && isJSONArray(content.json) ? Mode.table : Mode.tree
  }

  function scrollToSelection() {
    const selection: JSONEditorSelection | undefined = last(stack)?.selection
    if (isJSONSelection(selection)) {
      refEditor.scrollTo(getFocusPath(selection))
    }
  }

  function handleApply() {
    debug('handleApply')

    if (readOnly) {
      return
    }

    try {
      error = undefined

      const path = currentState.relativePath
      const content = currentState.content
      const operations: JSONPatchDocument = [
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: toJSONContent(content, parser).json // this can throw an error
        }
      ]

      if (stack.length > 1) {
        const parentContent = stack[stack.length - 2].content
        const parentJson = toJSONContent(parentContent, parser).json
        const updatedParentContent = {
          json: immutableJSONPatch(parentJson, operations)
        }

        // after successfully updated, remove from the stack and apply the change to the parent
        const parentState = stack[stack.length - 2] || rootState
        const updatedParentState: ModalState = { ...parentState, content: updatedParentContent }
        stack = [...stack.slice(0, stack.length - 2), updatedParentState]
        tick().then(scrollToSelection)
      } else {
        onPatch(operations)

        onClose()
      }
    } catch (err) {
      error = String(err)
    }
  }

  function handleClose() {
    debug('handleClose')

    if (fullscreen) {
      // exit fullscreen
      fullscreen = false
    } else if (stack.length > 1) {
      // remove the last item from the stack
      stack = initial(stack)
      tick().then(() => {
        refEditor?.focus()
        scrollToSelection()
      })

      // clear any error from the just closed state
      error = undefined
    } else {
      // this is the first modal, the root state, close the modal
      onClose()
    }
  }

  function handleChange(updatedContent: Content) {
    debug('handleChange', updatedContent)
    updateState((state) => ({ ...state, content: updatedContent }))
  }

  function handleChangeSelection(newSelection: JSONEditorSelection | undefined) {
    debug('handleChangeSelection', newSelection)
    updateState((state) => ({ ...state, selection: newSelection }))
  }

  function handleChangeMode(newMode: Mode) {
    debug('handleChangeMode', newMode)
    updateState((state) => ({ ...state, mode: newMode }))
  }

  function updateState(callback: (state: ModalState) => ModalState) {
    const state = last(stack) as ModalState
    const updatedState = callback(state)
    stack = [...initial(stack), updatedState]
  }

  function handleError(newError: Error) {
    error = newError.toString()
    console.error(newError)
  }

  function handleJSONEditorModal({ content, path }: JSONEditorModalCallback) {
    debug('handleJSONEditorModal', { content, path })

    const nestedModalState = {
      mode: determineMode(content),
      content,
      selection: undefined,
      relativePath: path
    }
    stack = [...stack, nestedModalState]

    tick().then(() => refEditor?.focus())
  }

  function focus(element: HTMLElement) {
    element.focus()
  }
</script>

<Modal onClose={handleClose} className="jse-jsoneditor-modal" {fullscreen}>
  <div class="jse-modal-wrapper">
    <AbsolutePopup>
      <Header
        title="Edit nested content {stack.length > 1 ? ` (${stack.length})` : ''}"
        fullScreenButton={true}
        bind:fullscreen
        onClose={handleClose}
      />

      <div class="jse-modal-contents">
        <div class="jse-label">
          <div class="jse-label-inner">Path</div>
        </div>
        <input
          class="jse-path"
          type="text"
          readonly
          title="Selected path"
          value={pathDescription}
        />

        <div class="jse-label">
          <div class="jse-label-inner">Contents</div>
        </div>

        <div class="jse-modal-inline-editor">
          <JSONEditorRoot
            bind:this={refEditor}
            externalMode={currentState.mode}
            content={currentState.content}
            selection={currentState.selection}
            {readOnly}
            {indentation}
            {tabSize}
            {statusBar}
            {askToFormat}
            {mainMenuBar}
            {navigationBar}
            {escapeControlCharacters}
            {escapeUnicodeCharacters}
            {flattenColumns}
            {parser}
            {parseMemoizeOne}
            {validator}
            {validationParser}
            {pathParser}
            insideModal={true}
            onError={handleError}
            onChange={handleChange}
            onChangeMode={handleChangeMode}
            onSelect={handleChangeSelection}
            {onRenderValue}
            {onClassName}
            onFocus={noop}
            onBlur={noop}
            {onRenderMenu}
            {onRenderContextMenu}
            {onSortModal}
            {onTransformModal}
            onJSONEditorModal={handleJSONEditorModal}
          />
        </div>

        <div class="jse-actions">
          {#if error}
            <div class="jse-error">
              {error}
            </div>
          {/if}

          {#if stack.length > 1}
            <button type="button" class="jse-secondary" on:click={handleClose}>
              <Icon data={faCaretLeft} /> Back
            </button>
          {/if}
          {#if !readOnly}
            <button type="button" class="jse-primary" on:click={handleApply} use:focus>
              Apply
            </button>
          {:else}
            <button type="button" class="jse-primary" on:click={handleClose}> Close </button>
          {/if}
        </div>
      </div>
    </AbsolutePopup>
  </div>
</Modal>

<style src="./JSONEditorModal.scss"></style>
