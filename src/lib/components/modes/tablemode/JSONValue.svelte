<svelte:options immutable={true} />

<script lang="ts">
  import type {
    AfterPatchCallback,
    JSONEditorContext,
    JSONSelection,
    SearchResultItem
  } from '$lib/types'
  import { isSvelteActionRenderer } from '$lib/typeguards.js'
  import type { JSONPatchDocument, JSONPath } from 'immutable-json-patch'
  import { isEditingSelection, isValueSelection } from '$lib/logic/selection.js'
  import { createNestedValueOperations } from '$lib/logic/operations.js'

  export let path: JSONPath
  export let value: unknown
  export let context: JSONEditorContext
  export let enforceString: boolean
  export let selection: JSONSelection | null
  export let searchResultItems: SearchResultItem[] | undefined

  function handlePatch(operations: JSONPatchDocument, afterPatch?: AfterPatchCallback) {
    // When having flattened table columns, it is possible that we edit a nested value of which
    // the parent object is not existing. Therefore, we call replaceNestedValue to create
    // the parent object(s) first.
    return context.onPatch(createNestedValueOperations(operations, context.getJson()), afterPatch)
  }

  $: isEditing = !context.readOnly && isValueSelection(selection) && isEditingSelection(selection)

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
    onPatch: handlePatch,
    onPasteJson: context.onPasteJson,
    onSelect: context.onSelect,
    onFind: context.onFind,
    findNextInside: context.findNextInside,
    focus: context.focus
  })
</script>

{#each renderers as renderer}
  {#if isSvelteActionRenderer(renderer)}
    {@const action = renderer.action}
    {#key renderer.action}
      <div
        role="button"
        tabindex="-1"
        class="jse-value"
        data-type="selectable-value"
        use:action={renderer.props}
      />
    {/key}
  {:else}
    {#key renderer.component}
      <svelte:component this={renderer.component} {...renderer.props} />
    {/key}
  {/if}
{/each}
