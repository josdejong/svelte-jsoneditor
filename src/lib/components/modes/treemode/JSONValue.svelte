<svelte:options immutable={true} />

<script lang="ts">
  import { SELECTION_TYPE } from '../../../logic/selection'
  import { isEqual } from 'lodash-es'
  import type { SearchResultItem, Selection, Path, TreeModeContext } from '../../../types'

  export let path: Path
  export let value: JSON

  export let context: TreeModeContext

  export let enforceString: boolean
  export let selection: Selection | undefined

  export let searchResult: SearchResultItem | undefined

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
