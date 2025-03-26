<script lang="ts">
  import { isUrl } from '$lib/utils/typeUtils.js'
  import { createEditValueSelection } from '$lib/logic/selection.js'
  import SearchResultHighlighter from '../../../components/modes/treemode/highlight/SearchResultHighlighter.svelte'
  import { getValueClass } from './utils/getValueClass.js'
  import { addNewLineSuffix } from '$lib/utils/domUtils.js'
  import { type RenderValueProps } from '$lib/types.js'
  import { isCtrlKeyDown } from 'svelte-jsoneditor/utils/keyBindings'
  import { formatSize } from '$lib/utils/fileUtils'
  import Tag from '../../../components/controls/Tag.svelte'

  const {
    path,
    value,
    mode,
    truncateTextSize,
    readOnly,
    normalization,
    parser,
    onSelect,
    searchResultItems
  }: RenderValueProps = $props()

  let doTruncate = $state(true)
  const isTruncated = $derived(
    doTruncate &&
      typeof value === 'string' &&
      value.length > truncateTextSize &&
      (!searchResultItems ||
        !searchResultItems.some((item) => item.active && item.end > truncateTextSize))
  )
  const truncatedValue = $derived(
    isTruncated && typeof value === 'string' ? value.substring(0, truncateTextSize).trim() : value
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

  function handleShowMore() {
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
    <Tag onclick={handleShowMore}>
      Show more ({formatSize(value.length)})
    </Tag>
  {/if}
</div>

<style src="./ReadonlyValue.scss"></style>
