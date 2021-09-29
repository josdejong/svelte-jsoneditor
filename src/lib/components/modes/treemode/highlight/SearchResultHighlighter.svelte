<script>
  import { splitValue } from '$lib/logic/search'

  /** @type {string} */
  export let text

  /** @type {SearchResultItem} */
  export let searchResult

  $: parts = splitValue(text, searchResult)
</script>

{#each parts as part}
  {#if part.type === 'normal'}
    {part.text}
  {:else}
    <span class="jse-highlight" class:jse-active={part.active}>{part.text}</span>
  {/if}
{/each}

<style src="./SearchResultHighlighter.scss"></style>
