<script lang="ts">
  import type { MenuDropDownButton } from '$lib/types'
  import DropdownButton from '../DropdownButton.svelte'
  import Icon from 'svelte-awesome'
  import { classnames } from '$lib/utils/cssUtils.js'

  export let item: MenuDropDownButton
  export let className: string | undefined = undefined
  export let onRequestClose: () => void

  $: items = item.items.map((item) => ({
    ...item,
    onClick: (event: MouseEvent) => {
      onRequestClose()
      item.onClick(event)
    }
  }))
</script>

<DropdownButton width={item.width} {items}>
  <button
    class={classnames('jse-context-menu-button', className, item.main.className)}
    type="button"
    slot="defaultItem"
    title={item.main.title}
    on:click={(event) => {
      onRequestClose()
      item.main.onClick(event)
    }}
    disabled={item.main.disabled || false}
  >
    {#if item.main.icon}
      <Icon data={item.main.icon} />
    {/if}
    {item.main.text}
  </button>
</DropdownButton>

<style src="./ContextMenuDropDownButton.scss"></style>
