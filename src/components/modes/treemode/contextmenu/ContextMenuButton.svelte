<script>
  import { faCaretDown } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'
  import {
    CONTEXT_MENU_HEIGHT,
    CONTEXT_MENU_WIDTH
  } from '../../../../constants.js'

  export let onContextMenu

  function handleClick (event) {
    let buttonElem = event.target
    while (buttonElem && buttonElem.nodeName !== 'BUTTON') {
      buttonElem = buttonElem.parentNode
    }

    if (buttonElem) {
      const rect = buttonElem.getBoundingClientRect()

      // TODO: move all this logic inside AbsolutePopup
      const renderAbove = ((rect.bottom + CONTEXT_MENU_HEIGHT > window.innerHeight) && (rect.top > CONTEXT_MENU_HEIGHT))
      const verticalPosition = renderAbove
        ? 'top'
        : 'bottom'
      const renderLeft = ((rect.left + CONTEXT_MENU_WIDTH > window.innerWidth) && (rect.right > CONTEXT_MENU_WIDTH))
      const horizontalPosition = renderLeft
        ? 'left'
        : 'right'

      onContextMenu({
        left: renderLeft
          ? rect.right
          : rect.left,
        top: renderAbove
          ? rect.top - 2
          : rect.bottom + 2,
        verticalPosition,
        horizontalPosition
      })
    }
  }
</script>

<button
  class="context-menu-button"
  title="Open context menu (Click here, right click on the selection, or use the ContextMenu button or Ctrl+Q)"
  on:click={handleClick}
>
  <Icon data={faCaretDown} />
</button>

<style src="./ContextMenuButton.scss"></style>
