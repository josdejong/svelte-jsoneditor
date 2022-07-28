<svelte:options immutable={true} />

<script lang="ts">
  import { faCaretDown } from '@fortawesome/free-solid-svg-icons/index.es'
  import Icon from 'svelte-awesome'
  import {
    CONTEXT_MENU_EXPLANATION,
    CONTEXT_MENU_HEIGHT,
    CONTEXT_MENU_WIDTH
  } from '../../../../constants.js'
  import type { OnContextMenu } from '../../../../types'

  export let selected: boolean
  export let onContextMenu: OnContextMenu

  function handleClick(event) {
    let buttonElem = event.target
    while (buttonElem && buttonElem.nodeName !== 'BUTTON') {
      buttonElem = buttonElem.parentNode
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
  class="jse-context-menu-button"
  class:jse-selected={selected}
  title={CONTEXT_MENU_EXPLANATION}
  on:click={handleClick}
>
  <Icon data={faCaretDown} />
</button>

<style src="./ContextMenuButton.scss"></style>
