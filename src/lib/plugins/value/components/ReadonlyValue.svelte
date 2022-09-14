<svelte:options immutable={true} />

<script lang="ts">
  import { isUrl } from '$lib/utils/typeUtils'
  import { createValueSelection } from '../../../logic/selection'
  import SearchResultHighlighter from '../../../components/modes/treemode/highlight/SearchResultHighlighter.svelte'
  import { getValueClass } from './utils/getValueClass'
  import { addNewLineSuffix } from '$lib/utils/domUtils'
  import type {
    ExtendedSearchResultItem,
    JSONParser,
    JSONPath,
    JSONValue,
    OnSelect,
    ValueNormalization
  } from '../../../types'

  export let path: JSONPath
  export let value: JSONValue
  export let readOnly: boolean
  export let normalization: ValueNormalization
  export let parser: JSONParser
  export let onSelect: OnSelect

  export let searchResultItems: ExtendedSearchResultItem[] | undefined

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
      onSelect(createValueSelection(path, true))
    }
  }
</script>

<div
  data-type="selectable-value"
  class={getValueClass(value, parser)}
  on:click={handleValueClick}
  on:dblclick={handleValueDoubleClick}
  title={valueIsUrl ? 'Ctrl+Click or Ctrl+Enter to open url in new window' : null}
>
  {#if searchResultItems}
    <SearchResultHighlighter text={normalization.escapeValue(value)} {searchResultItems} />
  {:else}
    {addNewLineSuffix(normalization.escapeValue(value))}
  {/if}
</div>

<style src="./ReadonlyValue.scss"></style>
