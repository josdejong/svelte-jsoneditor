<svelte:options immutable={true} />

<script>
  import { limit } from '../../../utils/arrayUtils'
  import { truncate } from '../../../utils/stringUtils'

  export let items
  export let selectedItem
  export let onSelect

  const MAX_ITEMS = 100
  const MAX_ITEM_CHARACTERS = 30
</script>

<div class="jse-navigation-bar-dropdown">
  {#each limit(items, MAX_ITEMS) as item (item)}
    <button
      type="button"
      class="jse-navigation-bar-dropdown-item"
      class:jse-selected={item === selectedItem}
      on:click|stopPropagation={() => onSelect(item)}
      title={item}
    >
      {truncate(item, MAX_ITEM_CHARACTERS)}
    </button>
  {/each}
  {#if items.length > MAX_ITEMS}
    <button
      type="button"
      class="jse-navigation-bar-dropdown-item"
      title="Limited to {MAX_ITEMS} items"
    >
      ...
    </button>
  {/if}
</div>

<style src="./NavigationBarDropdown.scss"></style>
