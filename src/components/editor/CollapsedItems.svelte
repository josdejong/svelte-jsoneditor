<script>
  import {
    INDENTATION_WIDTH
  } from '../../constants.js'
  import { getExpandItemsSections } from '../../logic/expandItemsSections.js'

  export let visibleSections
  export let sectionIndex
  export let total
  export let path

  /** @type {function (path: Path, section: Section)} */
  export let onExpandSection

  $: visibleSection = visibleSections[sectionIndex]

  $: startIndex = visibleSection.end
  $: endIndex = visibleSections[sectionIndex + 1]
    ? visibleSections[sectionIndex + 1].start
    : total

  $: expandItemsSections = getExpandItemsSections(startIndex, endIndex)

  // TODO: this is duplicated from the same function in JSONNode
  function getIndentationStyle (level) {
    return `margin-left: ${level * INDENTATION_WIDTH}px`
  }

  function handleMouseMove (event) {
    // prevent the whole array from being selected whilst dragging over
    // a section with collapsed items
    event.stopPropagation()
  }
</script>

<div 
  class="collapsed-items" 
  on:mousemove={handleMouseMove}
  style={getIndentationStyle(path.length + 2)}
>
  <div>
    <div class="text">Items {startIndex}-{endIndex}</div
    >{#each expandItemsSections as expandItemsSection
    }<button class="expand-items" on:click={() => onExpandSection(path, expandItemsSection)}>
        show {expandItemsSection.start}-{expandItemsSection.end}
      </button>
    {/each}
  </div>
</div>

<style src="./CollapsedItems.scss"></style>
