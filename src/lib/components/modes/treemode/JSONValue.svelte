<script lang="ts">
  import type { ExtendedSearchResultItem, JSONEditorContext, JSONSelection } from '$lib/types.js'
  import type { JSONPath } from 'immutable-json-patch'
  import { isEditingSelection, isValueSelection } from '$lib/logic/selection.js'
  import { isSvelteActionRenderer } from '$lib/typeguards.js'

  interface Props {
    path: JSONPath
    value: unknown
    context: JSONEditorContext
    enforceString: boolean
    selection: JSONSelection | undefined
    searchResultItems: ExtendedSearchResultItem[] | undefined
  }

  const { path, value, context, enforceString, selection, searchResultItems }: Props = $props()

  const isEditing = $derived(isValueSelection(selection) && isEditingSelection(selection))

  const renderers = $derived(
    context.onRenderValue({
      path,
      value,
      mode: context.mode,
      truncateTextSize: context.truncateTextSize,
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
  )
</script>

{#each renderers as renderer}
  {#if isSvelteActionRenderer(renderer)}
    {@const action = renderer.action}
    <div
      role="button"
      tabindex="-1"
      class="jse-value"
      data-type="selectable-value"
      use:action={renderer.props}
    ></div>
  {:else}
    {@const Component = renderer.component}
    <Component {...renderer.props} />
  {/if}
{/each}
