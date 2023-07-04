<svelte:options immutable={true} />

<script lang="ts">
  import { getExpandItemsSections } from '$lib/logic/expandItemsSections.js'
  import type { JSONSelection, Section, VisibleSection, JSONEditorContext } from '$lib/types.js'
  import type { JSONPath } from 'immutable-json-patch'
  import { pathInSelection } from '$lib/logic/selection.js'

  export let visibleSections: VisibleSection[]
  export let sectionIndex: number
  export let total: number
  export let path: JSONPath
  export let selection: JSONSelection | undefined
  export let onExpandSection: (path: JSONPath, section: Section) => void
  export let context: JSONEditorContext

  $: visibleSection = visibleSections[sectionIndex]

  $: startIndex = visibleSection.end
  $: endIndex = visibleSections[sectionIndex + 1] ? visibleSections[sectionIndex + 1].start : total

  $: selected = pathInSelection(context.getJson(), selection, path.concat(String(startIndex)))

  $: expandItemsSections = getExpandItemsSections(startIndex, endIndex)

  // TODO: this is duplicated from the same function in JSONNode
  function getIndentationStyle(level) {
    return `margin-left: calc(${level} * var(--jse-indent-size))`
  }

  function handleMouseMove(event) {
    // prevent the whole array from being selected whilst dragging over
    // a section with collapsed items
    event.stopPropagation()
  }
</script>

<div
  class="jse-collapsed-items"
  class:jse-selected={selected}
  on:mousemove={handleMouseMove}
  style={getIndentationStyle(path.length + 2)}
>
  <div>
    <div class="jse-text">Items {startIndex}-{endIndex}</div>
    {#each expandItemsSections as expandItemsSection}<button
        type="button"
        class="jse-expand-items"
        on:click={() => onExpandSection(path, expandItemsSection)}
      >
        show {expandItemsSection.start}-{expandItemsSection.end}
      </button>
    {/each}
  </div>
</div>

<style src="./CollapsedItems.scss"></style>
