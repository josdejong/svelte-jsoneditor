<script>
  import { splitValue } from '$lib/logic/search'
  import { addNewLineSuffix } from '$lib/utils/domUtils'

  /** @type {string} */
  export let text

  /** @type {SearchResultItem} */
  export let searchResult

  $: parts = splitValue(String(text), searchResult)
</script>

{#each parts as part}
  {#if part.type === 'normal'}
    {part.text}
  {:else}
    <span class="jse-highlight" class:jse-active={part.active}>{addNewLineSuffix(part.text)}</span>
  {/if}
{/each}

<style src="./SearchResultHighlighter.scss"></style>
