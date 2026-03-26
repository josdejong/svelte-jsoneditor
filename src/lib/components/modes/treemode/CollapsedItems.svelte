<svelte:options immutable={true} />

<script lang="ts">
import type { JSONPath } from 'immutable-json-patch'
import { getExpandItemsSections } from '$lib/logic/expandItemsSections.js'
import { pathInSelection } from '$lib/logic/selection.js'
import type { JSONEditorContext, JSONSelection, Section, VisibleSection } from '$lib/types.js'

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

function handleMouseMove(event: MouseEvent) {
  // prevent the whole array from being selected whilst dragging over
  // a section with collapsed items
  event.stopPropagation()
}
</script>

<div
  role="none"
  class="jse-collapsed-items"
  class:jse-selected={selected}
  on:mousemove={handleMouseMove}
  style:--level={path.length + 2}
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
