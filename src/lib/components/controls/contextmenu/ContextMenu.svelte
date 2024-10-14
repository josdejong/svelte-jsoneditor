<svelte:options immutable={true} />

<script lang="ts">
  import { onMount } from 'svelte'
  import Icon from 'svelte-awesome'
  import { keyComboFromEvent } from '$lib/utils/keyBindings.js'
  import { faLightbulb } from '@fortawesome/free-regular-svg-icons'
  import { findNearestElement } from '$lib/utils/domUtils.js'
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
  export let onRequestClose: () => void
  export let tip: string | undefined

  let refContextMenu: HTMLDivElement

  onMount(() => {
    const firstEnabledButton = Array.from(refContextMenu.querySelectorAll('button')).find(
      (button) => !button.disabled
    )

    if (firstEnabledButton) {
      firstEnabledButton.focus()
    }
  })

  const directionByCombo: Record<string, 'Up' | 'Down' | 'Left' | 'Right'> = {
    ArrowUp: 'Up',
    ArrowDown: 'Down',
    ArrowLeft: 'Left',
    ArrowRight: 'Right'
  }

  function handleKeyDown(event: KeyboardEvent & { currentTarget: EventTarget & HTMLDivElement }) {
    const combo = keyComboFromEvent(event)
    const direction: 'Up' | 'Down' | 'Left' | 'Right' | undefined = directionByCombo[combo]

    if (direction && event.target) {
      event.preventDefault()

      const buttons: HTMLButtonElement[] = Array.from(
        refContextMenu.querySelectorAll('button:not([disabled])')
      )
      const nearest = findNearestElement<HTMLButtonElement>({
        allElements: buttons,
        currentElement: event.target as unknown as HTMLButtonElement,
        direction,
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

<div
  role="menu"
  tabindex="-1"
  class="jse-contextmenu"
  bind:this={refContextMenu}
  on:keydown={handleKeyDown}
>
  {#each items as item}
    {#if isMenuButton(item)}
      <ContextMenuButton {item} {onRequestClose} />
    {:else if isMenuDropDownButton(item)}
      <ContextMenuDropDownButton {item} {onRequestClose} />
    {:else if isContextMenuRow(item)}
      <div class="jse-row">
        {#each item.items as rowItem}
          {#if isMenuButton(rowItem)}
            <ContextMenuButton item={rowItem} {onRequestClose} />
          {:else if isMenuDropDownButton(rowItem)}
            <ContextMenuDropDownButton item={rowItem} {onRequestClose} />
          {:else if isContextMenuColumn(rowItem)}
            <div class="jse-column">
              {#each rowItem.items as columnItem}
                {#if isMenuButton(columnItem)}
                  <ContextMenuButton className="left" item={columnItem} {onRequestClose} />
                {:else if isMenuDropDownButton(columnItem)}
                  <ContextMenuDropDownButton className="left" item={columnItem} {onRequestClose} />
                {:else if isMenuSeparator(columnItem)}
                  <div class="jse-separator"></div>
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
            <div class="jse-separator"></div>
          {:else}
            {unknownMenuItem(rowItem)}
          {/if}
        {/each}
      </div>
    {:else if isMenuSeparator(item)}
      <div class="jse-separator"></div>
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
