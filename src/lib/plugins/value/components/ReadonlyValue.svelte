<svelte:options immutable={true} />

<script lang="ts">
  import { isUrl } from '$lib/utils/typeUtils.js'
  import { createEditValueSelection } from '$lib/logic/selection.js'
  import SearchResultHighlighter from '../../../components/modes/treemode/highlight/SearchResultHighlighter.svelte'
  import { getValueClass } from './utils/getValueClass.js'
  import { addNewLineSuffix } from '$lib/utils/domUtils.js'
  import {
    type ExtendedSearchResultItem,
    type JSONParser,
    type Mode,
    type OnJSONSelect,
    type ValueNormalization
  } from '$lib/types.js'
  import type { JSONPath } from 'immutable-json-patch'
  import { isCtrlKeyDown } from 'svelte-jsoneditor/utils/keyBindings'

  export let path: JSONPath
  export let value: unknown
  export let mode: Mode
  export let readOnly: boolean
  export let normalization: ValueNormalization
  export let parser: JSONParser
  export let onSelect: OnJSONSelect

  export let searchResultItems: ExtendedSearchResultItem[] | undefined

  $: valueIsUrl = isUrl(value)

  function handleValueClick(event: MouseEvent) {
    if (typeof value === 'string' && valueIsUrl && isCtrlKeyDown(event)) {
      event.preventDefault()
      event.stopPropagation()

      window.open(value, '_blank')
    }
  }

  function handleValueDoubleClick(event: MouseEvent) {
    if (!readOnly) {
      event.preventDefault()
      onSelect(createEditValueSelection(path))
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
  role="button"
  tabindex="-1"
  data-type="selectable-value"
  class={getValueClass(value, mode, parser)}
  on:click={handleValueClick}
  on:dblclick={handleValueDoubleClick}
  title={valueIsUrl ? 'Ctrl+Click or Ctrl+Enter to open url in new window' : undefined}
>
  {#if searchResultItems}
    <SearchResultHighlighter text={normalization.escapeValue(value)} {searchResultItems} />
  {:else}
    {addNewLineSuffix(normalization.escapeValue(value))}
  {/if}
</div>

<style src="./ReadonlyValue.scss"></style>
