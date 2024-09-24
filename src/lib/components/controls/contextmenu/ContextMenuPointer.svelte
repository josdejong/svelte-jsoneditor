<svelte:options immutable={true} />

<script lang="ts">
  import { faCaretDown } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'
  import {
    CONTEXT_MENU_EXPLANATION,
    CONTEXT_MENU_HEIGHT,
    CONTEXT_MENU_WIDTH
  } from '$lib/constants.js'
  import type { OnContextMenu } from '$lib/types'

  export let root: boolean = false
  export let insert: boolean = false
  export let selected: boolean
  export let onContextMenu: OnContextMenu

  function handleClick(event: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement }) {
    let buttonElem: Element | undefined = event.target as HTMLButtonElement
    while (buttonElem && buttonElem.nodeName !== 'BUTTON') {
      buttonElem = buttonElem.parentNode as Element
    }

    if (buttonElem) {
      onContextMenu({
        anchor: buttonElem,
        left: 0,
        top: 0,
        width: CONTEXT_MENU_WIDTH,
        height: CONTEXT_MENU_HEIGHT,
        offsetTop: 2,
        offsetLeft: 0,
        showTip: true
      })
    }
  }
</script>

<button
  type="button"
  class="jse-context-menu-pointer"
  class:jse-root={root}
  class:jse-insert={insert}
  class:jse-selected={selected}
  title={CONTEXT_MENU_EXPLANATION}
  on:click={handleClick}
>
  <Icon data={faCaretDown} />
</button>

<style src="./ContextMenuPointer.scss"></style>
