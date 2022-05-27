<script lang="ts">
  import { splitValue } from '$lib/logic/search'
  import { addNewLineSuffix } from '$lib/utils/domUtils'
  import type { SearchResultItem } from '$lib/types'

  export let text: string
  export let searchResult: SearchResultItem[]

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
