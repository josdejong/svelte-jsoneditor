<svelte:options immutable={true} />

<script lang="ts">
  import { isUrl } from '$lib/utils/typeUtils'
  import { SELECTION_TYPE } from '../../../logic/selection'
  import SearchResultHighlighter from '../../../components/modes/treemode/highlight/SearchResultHighlighter.svelte'
  import { getValueClass } from './utils/getValueClass'
  import { addNewLineSuffix } from '$lib/utils/domUtils'
  import type {
    JSONData,
    OnSelect,
    Path,
    SearchResultItem,
    ValueNormalization
  } from '../../../types'

  export let path: Path
  export let value: JSONData
  export let readOnly: boolean
  export let normalization: ValueNormalization
  export let onSelect: OnSelect

  export let searchResult: SearchResultItem | undefined

  $: valueIsUrl = isUrl(value)

  function handleValueClick(event) {
    if (typeof value === 'string' && valueIsUrl && event.ctrlKey) {
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
