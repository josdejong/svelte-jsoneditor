<svelte:options immutable={true} />

<script>
  import { isUrl } from '$lib/utils/typeUtils'
  import { SELECTION_TYPE } from '$lib/logic/selection.js'
  import SearchResultHighlighter from '../../../components/modes/treemode/highlight/SearchResultHighlighter.svelte'
  import { getValueClass } from './utils/getValueClass'
  import { addNewLineSuffix } from '$lib/utils/domUtils.js'

  export let path
  export let value
  export let readOnly
  export let normalization
  export let onSelect

  /** @type {SearchResultItem | undefined} */
  export let searchResult

  $: valueIsUrl = isUrl(value)

  function handleValueClick(event) {
    if (valueIsUrl && event.ctrlKey) {
      event.preventDefault()
      event.stopPropagation()

      window.open(value, '_blank')
    }
  }

  function handleValueDoubleClick(event) {
    if (!readOnly) {
      event.preventDefault()
      onSelect({ type: SELECTION_TYPE.VALUE, path, edit: true })
    }
  }
</script>

<div
  data-type="selectable-value"
  class={getValueClass(value)}
  on:click={handleValueClick}
  on:dblclick={handleValueDoubleClick}
  title={valueIsUrl ? 'Ctrl+Click or Ctrl+Enter to open url in new window' : null}
>
  {#if searchResult}
    <SearchResultHighlighter text={normalization.escapeValue(value)} {searchResult} />
  {:else}
    {addNewLineSuffix(normalization.escapeValue(value))}
  {/if}
</div>

<style src="./ReadonlyValue.scss"></style>
