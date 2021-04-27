<script>
  import { faCaretDown } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'
  import {
    CONTEXT_MENU_HEIGHT,
    CONTEXT_MENU_WIDTH
  } from '../../../../constants.js'

  export let selected
  export let onContextMenu

  function handleClick (event) {
    let buttonElem = event.target
    while (buttonElem && buttonElem.nodeName !== 'BUTTON') {
      buttonElem = buttonElem.parentNode
    }

    if (buttonElem) {
      onContextMenu({
        anchor: buttonElem,
        width: CONTEXT_MENU_WIDTH,
        height: CONTEXT_MENU_HEIGHT,
      })
    }
  }
</script>

<button
  class="context-menu-button"
  class:selected={selected}
  title="Open context menu (Click here, right click on the selection, or use the ContextMenu button or Ctrl+Q)"
  on:click={handleClick}
>
  <Icon data={faCaretDown} />
</button>

<style src="./ContextMenuButton.scss"></style>
