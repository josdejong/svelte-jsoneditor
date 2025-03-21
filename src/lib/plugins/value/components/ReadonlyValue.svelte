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
  import { MAX_CHARACTERS_READONLY_VALUE } from '$lib/constants'
  import { formatSize } from '$lib/utils/fileUtils'

  interface Props {
    path: JSONPath
    value: unknown
    mode: Mode
    readOnly: boolean
    normalization: ValueNormalization
    parser: JSONParser
    onSelect: OnJSONSelect
    searchResultItems: ExtendedSearchResultItem[] | undefined
  }

  const { path, value, mode, readOnly, normalization, parser, onSelect, searchResultItems }: Props =
    $props()

  let doTruncate = $state(true)
  const isTruncated = $derived(
    doTruncate &&
      typeof value === 'string' &&
      value.length > MAX_CHARACTERS_READONLY_VALUE &&
      (!searchResultItems ||
        !searchResultItems.some((item) => item.active && item.end > MAX_CHARACTERS_READONLY_VALUE))
  )
  const truncatedValue = $derived(
    isTruncated && typeof value === 'string'
      ? value.substring(0, MAX_CHARACTERS_READONLY_VALUE).trim()
      : value
  )
  const valueIsUrl = $derived(isUrl(value))

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

  function handleShowMore(event: MouseEvent) {
    event.preventDefault()
    event.stopPropagation()

    doTruncate = false
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<div
  role="button"
  tabindex="-1"
  data-type="selectable-value"
  class={getValueClass(value, mode, parser)}
  onclick={handleValueClick}
  ondblclick={handleValueDoubleClick}
  title={valueIsUrl ? 'Ctrl+Click or Ctrl+Enter to open url in new window' : undefined}
>
  {#if searchResultItems}
    <SearchResultHighlighter text={normalization.escapeValue(truncatedValue)} {searchResultItems} />
  {:else}
    {addNewLineSuffix(normalization.escapeValue(truncatedValue))}
  {/if}
  {#if isTruncated && typeof value === 'string'}
    <button onclick={handleShowMore}>Show more ({formatSize(value.length, 1024)})</button>
  {/if}
</div>

<style src="./ReadonlyValue.scss"></style>
