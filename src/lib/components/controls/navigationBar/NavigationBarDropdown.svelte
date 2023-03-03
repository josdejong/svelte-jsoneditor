<svelte:options immutable={true} />

<script lang="ts">
  import { limit } from '$lib/utils/arrayUtils.js'
  import { truncate } from '$lib/utils/stringUtils.js'

  export let items: (string | number)[]
  export let selectedItem: string | number
  export let onSelect: (item: string | number) => void

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
      title={item.toString()}
    >
      {truncate(item.toString(), MAX_ITEM_CHARACTERS)}
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
