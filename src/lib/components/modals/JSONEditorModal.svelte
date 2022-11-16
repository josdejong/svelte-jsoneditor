<svelte:options immutable={true} />

<script lang="ts">
  import { getContext } from 'svelte'
  import Header from './Header.svelte'
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { compileJSONPointer } from 'immutable-json-patch'
  import { createDebug } from '../../utils/debug'
  import type {
    Content,
    JSONParser,
    JSONPathParser,
    OnClassName,
    OnJSONEditorModal,
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
  import { isEmpty } from 'lodash-es'
  import { stripRootObject } from '$lib/utils/pathUtils'
  import { toJSONContent } from '$lib'

  const debug = createDebug('jsoneditor:JSONEditorModal')

  export let content: Content // the nested document
  export let path: JSONPath
  export let onPatch: OnPatch

  export let readOnly: boolean
  export let indentation: number | string
  export let tabSize: number
  export let mode: Mode
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

  // FIXME: test whether opening a modal on top of a modal works
  export let onSortModal: OnSortModal
  export let onTransformModal: OnTransformModal
  export let onJSONEditorModal: OnJSONEditorModal

  const { close } = getContext('simple-modal')

  $: pathDescription = !isEmpty(path)
    ? stripRootObject(stringifyJSONPath(path))
    : '(whole document)'

  let error: string | undefined = undefined

  function handleApply() {
    try {
      error = undefined

      const operations: JSONPatchDocument = [
        {
          op: 'replace',
          path: compileJSONPointer(path),
          value: toJSONContent(content, parser).json // this can throw an error
        }
      ]
      onPatch(operations)

      close()
    } catch (err) {
      error = err.toString()
    }
  }

  function handleChange(updatedContent: Content) {
    content = updatedContent
    debug('onChange', updatedContent)
  }

  function handleChangeMode(newMode: Mode) {
    mode = newMode
  }

  function handleError(newError: Error) {
    error = newError.toString()
    console.error(newError)
  }

  function focus(element: HTMLElement) {
    element.focus()
  }
</script>

<div class="jse-modal jse-jsoneditor-modal">
  <Header title="Edit nested content" />

  <div class="jse-contents">
    <div class="jse-label">
      <div class="jse-label-inner">Path</div>
    </div>
    <input class="jse-path" type="text" readonly title="Selected path" value={pathDescription} />

    <div class="jse-label">
      <div class="jse-label-inner">Contents</div>
    </div>

    <JSONEditorRoot
      {mode}
      {content}
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
      {onJSONEditorModal}
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
