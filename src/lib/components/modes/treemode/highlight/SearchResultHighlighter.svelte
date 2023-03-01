<script lang="ts">
  import { splitValue } from '$lib/logic/search.js'
  import { addNewLineSuffix } from '$lib/utils/domUtils.js'
  import type { ExtendedSearchResultItem } from '$lib/types'

  export let text: string
  export let searchResultItems: ExtendedSearchResultItem[]

  $: parts = splitValue(String(text), searchResultItems)
</script>

{#each parts as part}
  {#if part.type === 'normal'}
    {part.text}
  {:else}
    <span class="jse-highlight" class:jse-active={part.active}>{addNewLineSuffix(part.text)}</span>
  {/if}
{/each}

<style src="./SearchResultHighlighter.scss"></style>
