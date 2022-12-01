<script lang="ts">
  import type { MenuDropDownButton } from '$lib/types'
  import DropdownButton from '$lib/components/controls/DropdownButton.svelte'
  import Icon from 'svelte-awesome'

  export let item: MenuDropDownButton
</script>

<DropdownButton width={item.width} items={item.items}>
  <button
    class="jse-context-menu-button"
    type="button"
    slot="defaultItem"
    title={item.main.title}
    on:click={item.main.onClick}
    disabled={item.main.disabled || false}
  >
    {#if item.main.icon}
      <Icon data={item.main.icon} />
    {/if}
    {item.main.text}
  </button>
</DropdownButton>

<style src="./ContextMenuDropDownButton.scss"></style>
