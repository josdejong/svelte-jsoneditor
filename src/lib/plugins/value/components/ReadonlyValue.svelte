<svelte:options immutable={true} />

<script lang="ts">
  import { isUrl } from '$lib/utils/typeUtils.js'
  import { createValueSelection } from '$lib/logic/selection.js'
  import SearchResultHighlighter from '../../../components/modes/treemode/highlight/SearchResultHighlighter.svelte'
  import { getValueClass } from './utils/getValueClass.js'
  import { addNewLineSuffix } from '$lib/utils/domUtils.js'
  import type {
    ExtendedSearchResultItem,
    JSONParser,
    JSONPath,
    JSONValue,
    OnJSONSelect,
    ValueNormalization
  } from '$lib/types.js'

  export let path: JSONPath
  export let value: JSONValue
  export let readOnly: boolean
  export let normalization: ValueNormalization
  export let parser: JSONParser
  export let onSelect: OnJSONSelect

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

<!-- svelte-ignore a11y-click-events-have-key-events -->
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
