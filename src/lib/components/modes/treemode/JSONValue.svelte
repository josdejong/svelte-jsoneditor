<svelte:options immutable={true} />

<script lang="ts">
  import type { JSONEditorContext, JSONSelection, SearchResultItem } from '$lib/types.js'
  import type { JSONPath } from 'immutable-json-patch'
  import { isEditingSelection, isValueSelection } from '$lib/logic/selection.js'

  export let path: JSONPath
  export let value: unknown
  export let context: JSONEditorContext
  export let enforceString: boolean
  export let selection: JSONSelection | null
  export let searchResultItems: SearchResultItem[] | undefined

  $: isEditing = isValueSelection(selection) && isEditingSelection(selection)

  $: renderers = context.onRenderValue({
    path,
    value,
    readOnly: context.readOnly,
    enforceString,
    isEditing,
    parser: context.parser,
    normalization: context.normalization,
    selection,
    searchResultItems,
    onPatch: context.onPatch,
    onPasteJson: context.onPasteJson,
    onSelect: context.onSelect,
    onFind: context.onFind,
    findNextInside: context.findNextInside,
    focus: context.focus
  })
</script>

{#each renderers as renderer}
  {#key renderer.component}
    <svelte:component this={renderer.component} {...renderer.props} />
  {/key}
{/each}
