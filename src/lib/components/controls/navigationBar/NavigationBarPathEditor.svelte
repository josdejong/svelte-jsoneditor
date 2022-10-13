<script lang="ts">
  import type { JSONPath } from 'immutable-json-patch'
  import { parseJSONPath, stringifyJSONPath } from '$lib/utils/pathUtils'
  import { getContext, onDestroy, onMount } from 'svelte'
  import copyToClipBoard from '$lib/utils/copyToClipboard'
  import { faCopy, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'
  import { tooltip } from '../../controls/tooltip/tooltip.ts'
  import type { OnError } from '$lib/types'

  const absolutePopupContext = getContext('absolute-popup')

  export let path: JSONPath
  export let onChange: (updatedPath: JSONPath) => void
  export let onClose: () => void
  export let onError: OnError
  export let pathExists: (path: JSONPath) => boolean

  let inputRef
  let inputPath: string
  let validationActive = false
  $: inputPath = stringifyJSONPath(path)
  $: inputValidationError = validationActive ? parseAndValidate(inputPath).error : undefined

  let copiedTimer = undefined
  let copied = false
  const copiedDelay = 1000 // ms

  onMount(() => {
    focus()
  })

  onDestroy(() => {
    clearTimeout(copiedTimer)
  })

  function focus() {
    inputRef.focus()
  }

  function parseAndValidate(pathStr: string): {
    path: JSONPath | undefined
    error: Error | undefined
  } {
    try {
      const path = parseJSONPath(pathStr)
      validatePathExists(path)
      return {
        path,
        error: undefined
      }
    } catch (error) {
      return {
        path: undefined,
        error
      }
    }
  }

  function validatePathExists(path: JSONPath) {
    if (!pathExists(path)) {
      throw new Error('Path does not exist in current document')
    }
  }

  function handleInput(event) {
    inputPath = event.currentTarget.value
  }

  function handleKeyDown(event: KeyboardEvent) {
    const combo = keyComboFromEvent(event)

    if (combo === 'Escape') {
      onClose()
    }

    if (combo === 'Enter') {
      validationActive = true
      const result = parseAndValidate(inputPath)
      if (result.path !== undefined) {
        onChange(result.path)
      } else {
        onError(result.error)
      }
    }
  }

  function handleCopy() {
    copyToClipBoard(inputPath)
    copied = true
    copiedTimer = setTimeout(() => (copied = false), copiedDelay)
    focus()
  }
</script>

<div class="jse-navigation-bar-path-editor" class:error={inputValidationError}>
  <input
    type="text"
    class="jse-navigation-bar-text"
    value={inputPath}
    bind:this={inputRef}
    on:keydown|stopPropagation={handleKeyDown}
    on:input={handleInput}
  />
  {#if inputValidationError}
    <button
      type="button"
      class="jse-navigation-bar-validation-error"
      use:tooltip={{
        text: inputValidationError,
        ...absolutePopupContext
      }}
    >
      <Icon data={faExclamationTriangle} />
    </button>
  {/if}
  {#if copied}
    <div class="jse-copied-text">Copied!</div>
  {/if}
  <button
    type="button"
    class="jse-navigation-bar-copy"
    class:copied
    title="Copy selected path to the clipboard"
    on:click={handleCopy}
  >
    <Icon data={faCopy} />
  </button>
</div>

<style src="./NavigationBarPathEditor.scss"></style>
