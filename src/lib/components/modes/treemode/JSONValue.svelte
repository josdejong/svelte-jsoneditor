<svelte:options immutable={true} />

<script>
  import { renderValue } from '$lib/plugins/value/renderValue.js'

  export let path
  export let value
  export let readOnly
  export let selection

  /** @type {SearchResultItem | undefined} */
  export let searchResult

  export let onPatch
  export let onPasteJson
  export let onSelect

  $: renderers = renderValue({
    path,
    value,
    readOnly,
    selection,
    searchResult,
    onPatch,
    onPasteJson,
    onSelect
  })
</script>

{#each renderers as renderer}
  <svelte:component this={renderer.component} {...renderer.props} />
{/each}
