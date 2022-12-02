<script lang="ts">
  import classnames from 'classnames'
  import type { MenuButton } from '$lib/types'
  import Icon from 'svelte-awesome'

  export let item: MenuButton
  export let className: string | undefined
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
