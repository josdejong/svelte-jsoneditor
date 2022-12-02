<svelte:options immutable={true} />

<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from 'svelte-awesome'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'
  import { faLightbulb } from '@fortawesome/free-regular-svg-icons'
  import { findNearestElement } from '$lib/utils/domUtils'
  import type { ContextMenuItem, MenuItem } from '$lib/types.js'
  import {
    isContextMenuColumn,
    isContextMenuRow,
    isMenuButton,
    isMenuDropDownButton,
    isMenuLabel,
    isMenuSeparator
  } from '$lib/typeguards.js'
  import ContextMenuButton from './ContextMenuButton.svelte'
  import ContextMenuDropDownButton from './ContextMenuDropDownButton.svelte'

  export let items: ContextMenuItem[]
  export let tip: string | undefined

  let refContextMenu

  onMount(() => {
    setTimeout(() => {
      const firstEnabledButton = [...refContextMenu.querySelectorAll('button')].find(
        (button) => !button.disabled
      )

      if (firstEnabledButton) {
        firstEnabledButton.focus()
      }
    })
  })

  function handleKeyDown(event) {
    const combo = keyComboFromEvent(event).replace(/^Command\+/, 'Ctrl+')

    if (combo === 'Up' || combo === 'Down' || combo === 'Left' || combo === 'Right') {
      event.preventDefault()

      const buttons: HTMLButtonElement[] = Array.from(
        refContextMenu.querySelectorAll('button:not([disabled])')
      )
      const nearest = findNearestElement({
        allElements: buttons,
        currentElement: event.target,
        direction: combo,
        hasPrio: (element: HTMLButtonElement) => {
          return element.getAttribute('data-type') !== 'jse-open-dropdown'
        }
      })
      if (nearest) {
        nearest.focus()
      }
    }
  }

  function unknownMenuItem(item: MenuItem): string {
    console.error('Unknown type of context menu item', item)
    return '???'
  }
</script>

<div class="jse-contextmenu" bind:this={refContextMenu} on:keydown={handleKeyDown}>
  {#each items as item}
    {#if isMenuButton(item)}
      <ContextMenuButton {item} />
    {:else if isMenuDropDownButton(item)}
      <ContextMenuDropDownButton {item} />
    {:else if isContextMenuRow(item)}
      <div class="jse-row">
        {#each item.items as rowItem}
          {#if isMenuButton(rowItem)}
            <ContextMenuButton item={rowItem} />
          {:else if isMenuDropDownButton(rowItem)}
            <ContextMenuDropDownButton item={rowItem} />
          {:else if isContextMenuColumn(rowItem)}
            <div class="jse-column">
              {#each rowItem.items as columnItem}
                {#if isMenuButton(columnItem)}
                  <ContextMenuButton className="left" item={columnItem} />
                {:else if isMenuDropDownButton(columnItem)}
                  <ContextMenuDropDownButton className="left" item={columnItem} />
                {:else if isMenuSeparator(columnItem)}
                  <div class="jse-separator" />
                {:else if isMenuLabel(columnItem)}
                  <div class="jse-label">
                    {columnItem.text}
                  </div>
                {:else}
                  {unknownMenuItem(columnItem)}
                {/if}
              {/each}
            </div>
          {:else if isMenuSeparator(rowItem)}
            <div class="jse-separator" />
          {:else}
            {unknownMenuItem(rowItem)}
          {/if}
        {/each}
      </div>
    {:else if isMenuSeparator(item)}
      <div class="jse-separator" />
    {:else}
      {unknownMenuItem(item)}
    {/if}
  {/each}

  {#if tip}
    <div class="jse-row">
      <div class="jse-tip">
        <div class="jse-tip-icon">
          <Icon data={faLightbulb} />
        </div>
        <div class="jse-tip-text">{tip}</div>
      </div>
    </div>
  {/if}
</div>

<style src="./ContextMenu.scss"></style>
