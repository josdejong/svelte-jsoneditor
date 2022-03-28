<svelte:options immutable={true} />

<script>
  import { SELECTION_TYPE } from '$lib/logic/selection'
  import { isEqual } from 'lodash-es'

  export let path
  export let value

  /** @type {TreeModeContext} */
  export let context

  export let enforceString
  export let selection

  /** @type {SearchResultItem | undefined} */
  export let searchResult

  $: isSelected =
    selection && selection.type === SELECTION_TYPE.VALUE
      ? isEqual(selection.focusPath, path)
      : false

  $: isEditing = !context.readOnly && isSelected && selection && selection.edit === true

  $: renderers = context.onRenderValue({
    path,
    value,
    readOnly: context.readOnly,
    enforceString,
    isSelected,
    isEditing,
    normalization: context.normalization,
    selection,
    searchResult,
    onPatch: context.onPatch,
    onPasteJson: context.onPasteJson,
    onSelect: context.onSelect,
    onFind: context.onFind
  })
</script>

{#each renderers as renderer}
  <svelte:component this={renderer.component} {...renderer.props} />
{/each}
