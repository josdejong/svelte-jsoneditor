<svelte:options immutable={true} />

<script>
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import { isEqual } from 'lodash-es'

  export let path
  export let value
  export let readOnly
  export let enforceString
  export let selection

  /** @type {SearchResultItem | undefined} */
  export let searchResult

  /** @type {ValueNormalization} */
  export let normalization

  export let onPatch
  export let onPasteJson
  export let onSelect
  export let onFind
  export let onRenderValue

  $: isSelected =
    selection && selection.type === SELECTION_TYPE.VALUE
      ? isEqual(selection.focusPath, path)
      : false

  $: isEditing = !readOnly && isSelected && selection && selection.edit === true

  $: renderers = onRenderValue({
    path,
    value,
    readOnly,
    enforceString,
    isSelected,
    isEditing,
    normalization,
    selection,
    searchResult,
    onPatch,
    onPasteJson,
    onSelect,
    onFind
  })
</script>

{#each renderers as renderer}
  <svelte:component this={renderer.component} {...renderer.props} />
{/each}
