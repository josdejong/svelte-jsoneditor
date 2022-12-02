<script lang="ts">
  import type { MenuButton } from '$lib/types'
  import Icon from 'svelte-awesome'
  import { classnames } from '$lib/utils/cssUtils.js'

  export let item: MenuButton
  export let className: string | undefined = undefined
</script>

<button
  type="button"
  class={classnames('jse-context-menu-button', className, item.className)}
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
