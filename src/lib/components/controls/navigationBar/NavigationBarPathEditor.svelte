<script lang="ts">
  import type { JSONPath } from 'immutable-json-patch'
  import { parseJSONPath, stringifyJSONPath } from '$lib/utils/pathUtils'
  import { getContext, onMount } from 'svelte'
  import copyToClipBoard from '$lib/utils/copyToClipboard'
  import { faCopy, faExclamationTriangle } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'
  import { tooltip } from '../../controls/tooltip/tooltip.ts'

  const absolutePopupContext = getContext('absolute-popup')

  export let path: JSONPath
  export let onChange: (updatedPath: JSONPath) => void
  export let onClose: () => void

  let inputRef
  let inputPath: string
  let validationActive = false
  $: inputPath = stringifyJSONPath(path)
  $: inputValidationError = validationActive ? validate(inputPath) : undefined

  onMount(() => {
    inputRef.focus()
  })

  function validate(path: string): string | undefined {
    try {
      parseJSONPath(path)
      return undefined
    } catch (err) {
      return err.toString()
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
      try {
        const updatedPath = parseJSONPath(inputPath)
        onChange(updatedPath)
      } catch (err) {
        console.error(err)
      }
    }
  }

  function handleCopy() {
    copyToClipBoard(inputPath)
    // TODO: show feedback to the user that the path has been copied
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
  <button
    type="button"
    class="jse-navigation-bar-copy"
    title="Copy selected path to the clipboard"
    on:click={handleCopy}
  >
    <Icon data={faCopy} />
  </button>
</div>

<style src="./NavigationBarPathEditor.scss"></style>
