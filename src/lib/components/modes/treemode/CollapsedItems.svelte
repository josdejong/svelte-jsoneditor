<svelte:options immutable={true} />

<script>
  import { getExpandItemsSections } from '$lib/logic/expandItemsSections'
  import { compileJSONPointer } from 'immutable-json-patch'

  export let visibleSections
  export let sectionIndex
  export let total
  export let path
  export let selection

  /** @type {function (path: Path, section: Section)} */
  export let onExpandSection

  $: visibleSection = visibleSections[sectionIndex]

  $: startIndex = visibleSection.end
  $: endIndex = visibleSections[sectionIndex + 1] ? visibleSections[sectionIndex + 1].start : total

  $: selected =
    selection && selection.pathsMap
      ? selection.pathsMap[compileJSONPointer(path.concat(startIndex))] === true
      : false

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
