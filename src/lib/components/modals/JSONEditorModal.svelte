<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte'
  import Header from './Header.svelte'
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { compileJSONPointer, immutableJSONPatch, isJSONArray } from 'immutable-json-patch'
  import { createDebug } from '../../utils/debug'
  import type {
    Content,
    JSONEditorModalCallback,
    JSONParser,
    JSONPathParser,
    OnClassName,
    OnPatch,
    OnRenderMenu,
    OnRenderValue,
    OnSortModal,
    OnTransformModal,
    Validator
  } from '../../types'
  import { Mode } from '../../types'
  import JSONEditorRoot from '$lib/components/modes/JSONEditorRoot.svelte'
  import { noop } from '$lib/utils/noop.js'
  import { stringifyJSONPath } from '../../utils/pathUtils'
  import { initial, isEmpty, last } from 'lodash-es'
  import { stripRootObject } from '$lib/utils/pathUtils'
  import { isJSONContent, toJSONContent } from '$lib'

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
  export let escapeControlCharacters: boolean
  export let escapeUnicodeCharacters: boolean
  export let flattenColumns: boolean
  export let parser: JSONParser
  export let validator: Validator | null
  export let validationParser: JSONParser
  export let pathParser: JSONPathParser

  export let onRenderValue: OnRenderValue
  export let onClassName: OnClassName
  export let onRenderMenu: OnRenderMenu

  export let onSortModal: OnSortModal
  export let onTransformModal: OnTransformModal

  const { close } = getContext('simple-modal')

  interface ModalState {
    mode: Mode
    content: Content
    relativePath: JSONPath
  }

  const rootState: ModalState = {
    mode: determineMode(content),
    content,
    relativePath: path
  }
  let stack: ModalState[] = [rootState]

  $: absolutePath = stack.flatMap((state) => state.relativePath)
  $: pathDescription = !isEmpty(absolutePath)
    ? stripRootObject(stringifyJSONPath(absolutePath))
    : '(whole document)'

  let error: string | undefined = undefined

  function determineMode(content: Content): Mode {
    return isJSONContent(content) && isJSONArray(content.json) ? Mode.table : Mode.tree
  }

  function handleApply() {
    try {
      error = undefined

      const operations: JSONPatchDocument = [
        {
          op: 'replace',
          path: compileJSONPointer(last(stack).relativePath),
          value: toJSONContent(last(stack).content, parser).json // this can throw an error
        }
      ]

      if (stack.length > 1) {
        const parentContent = stack[stack.length - 2].content
        const parentJson = toJSONContent(parentContent, parser).json
        const updatedParentContent = {
          json: immutableJSONPatch(parentJson, operations)
        }

        // after successfully updated, remove from the stack and apply the change
        stack = initial(stack)
        handleChange(updatedParentContent)
      } else {
        onPatch(operations)

        close()
      }
    } catch (err) {
      error = err.toString()
    }
  }

  function handleClose() {
    debug('handleClose')

    if (stack.length > 1) {
      // remove the last item from the stack
      stack = initial(stack)
    } else {
      // this is the first modal, the root state, close the modal
      close()
    }
  }

  function handleChange(updatedContent: Content) {
    debug('handleChange', updatedContent)

    const updatedState = {
      ...last(stack),
      content: updatedContent
    }

    stack = [...initial(stack), updatedState]
  }

  function handleChangeMode(newMode: Mode) {
    debug('handleChangeMode', newMode)

    const updatedState = {
      ...last(stack),
      mode: newMode
    }

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
      relativePath: path
    }
    stack = [...stack, nestedModalState]
  }

  function focus(element: HTMLElement) {
    element.focus()
  }
</script>

<div class="jse-modal jse-jsoneditor-modal">
  <Header
    title="Edit nested content {stack.length > 1 ? ` (${stack.length})` : ''}"
    onClose={handleClose}
  />

  <div class="jse-contents">
    <div class="jse-label">
      <div class="jse-label-inner">Path</div>
    </div>
    <input class="jse-path" type="text" readonly title="Selected path" value={pathDescription} />

    <div class="jse-label">
      <div class="jse-label-inner">Contents</div>
    </div>

    <JSONEditorRoot
      mode={last(stack).mode}
      content={last(stack).content}
      {readOnly}
      {indentation}
      {tabSize}
      {statusBar}
      {mainMenuBar}
      {navigationBar}
      {escapeControlCharacters}
      {escapeUnicodeCharacters}
      {flattenColumns}
      {parser}
      {validator}
      {validationParser}
      {pathParser}
      onError={handleError}
      onChange={handleChange}
      onChangeMode={handleChangeMode}
      {onRenderValue}
      {onClassName}
      onFocus={noop}
      onBlur={noop}
      {onRenderMenu}
      {onSortModal}
      {onTransformModal}
      onJSONEditorModal={handleJSONEditorModal}
    />

    {#if error}
      <div class="jse-error">
        {error}
      </div>
    {/if}

    <div class="jse-actions">
      <button type="button" class="jse-primary" on:click={handleApply} use:focus> Apply </button>
    </div>
  </div>
</div>

<style src="./JSONEditorModal.scss"></style>
