<script lang="ts">
  import type { JSONPath } from 'immutable-json-patch'
  import { stringifyJSONPath } from '$lib/utils/pathUtils'
  import { onMount } from 'svelte'
  import copyToClipBoard from '$lib/utils/copyToClipboard'
  import { faCopy } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'

  export let path: JSONPath

  let inputRef
  let pathStr: string
  $: pathStr = stringifyJSONPath(path)

  onMount(() => {
    inputRef.focus()
  })

  function handleCopy() {
    copyToClipBoard(pathStr)
    // TODO: show feedback to the user that
  }
</script>

<div class="jse-navigation-bar-path-editor">
  <input
    type="text"
    class="jse-navigation-bar-text"
    value={pathStr}
    readonly
    bind:this={inputRef}
    on:keydown|stopPropagation
  />
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
