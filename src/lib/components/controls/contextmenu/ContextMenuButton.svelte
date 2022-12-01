<script lang="ts">
  import type { MenuButton } from '$lib/types'
  import Icon from 'svelte-awesome'

  export let item: MenuButton
</script>

<button
  type="button"
  class="jse-context-menu-button {item.className || ''}"
  on:click={item.onClick}
  title={item.title}
  disabled={item.disabled || false}
>
  {#if item.icon}
    <Icon data={item.icon} />
  {/if}
  {#if item.text}
    {item.text}
  {/if}
</button>

<style src="./ContextMenuButton.scss"></style>
