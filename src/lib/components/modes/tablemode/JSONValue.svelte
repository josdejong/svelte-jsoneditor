<svelte:options immutable={true} />

<script lang="ts">
  import type { JSONEditorContext, JSONSelection, SearchResultItem } from '../../../types'
  import type { JSONData, JSONPath } from 'immutable-json-patch'
  import { isEditingSelection, isValueSelection } from '../../../logic/selection'

  export let path: JSONPath
  export let value: JSONData
  export let context: JSONEditorContext
  export let isSelected: boolean
  export let enforceString: boolean
  export let selection: JSONSelection | undefined
  export let searchResultItems: SearchResultItem[] | undefined

  $: isEditing = !context.readOnly && isValueSelection(selection) && isEditingSelection(selection)

  $: renderers = context.onRenderValue({
    path,
    value,
    readOnly: context.readOnly,
    enforceString,
    isSelected,
    isEditing,
    parser: context.parser,
    normalization: context.normalization,
    selection,
    searchResultItems,
    onPatch: context.onPatch,
    onPasteJson: context.onPasteJson,
    onSelect: context.onSelect,
    onFind: context.onFind,
    focus: context.focus
  })
</script>

{#each renderers as renderer}
  <svelte:component this={renderer.component} {...renderer.props} />
{/each}
