<svelte:options immutable={true} />

<script lang="ts">
  import type {
    JSONData,
    JSONPointer,
    SearchResultItem,
    Selection,
    TreeModeContext
  } from '../../../types'
  import { parseJSONPointer } from 'immutable-json-patch'
  import { isEditingSelection, isValueSelection } from '../../../logic/selection'

  export let pointer: JSONPointer
  export let value: JSONData
  export let context: TreeModeContext
  export let enforceString: boolean
  export let selection: Selection | undefined
  export let searchResultItems: SearchResultItem[] | undefined

  $: path = parseJSONPointer(pointer)

  $: isSelected = selection
    ? selection.pointersMap[pointer] === true && isValueSelection(selection)
    : undefined

  $: isEditing = !context.readOnly && isValueSelection(selection) && isEditingSelection(selection)

  $: renderers = context.onRenderValue({
    path,
    value,
    readOnly: context.readOnly,
    enforceString,
    isSelected,
    isEditing,
    normalization: context.normalization,
    selection,
    searchResultItems,
    onPatch: context.onPatch,
    onPasteJson: context.onPasteJson,
    onSelect: context.onSelect,
    onFind: context.onFind
  })
</script>

{#each renderers as renderer}
  <svelte:component this={renderer.component} {...renderer.props} />
{/each}
