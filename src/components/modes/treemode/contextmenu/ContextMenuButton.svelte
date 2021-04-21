<script>
  import { faCaretDown } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'
  import { CONTEXT_MENU_HEIGHT } from '../../../../constants.js'

  export let onContextMenu

  function handleClick (event) {
    let buttonElem = event.target
    while (buttonElem && buttonElem.nodeName !== 'BUTTON') {
      buttonElem = buttonElem.parentNode
    }

    if (buttonElem) {
      const rect = buttonElem.getBoundingClientRect()

      const windowHeight = window.innerHeight
      const renderAbove = ((rect.bottom + CONTEXT_MENU_HEIGHT > windowHeight) && (rect.top > CONTEXT_MENU_HEIGHT))
      const position = renderAbove
        ? 'top'
        : 'bottom'

      onContextMenu({
        left: rect.left,
        top: renderAbove
          ? rect.top - 2
          : rect.bottom + 2,
        position
      })
    }
  }
</script>

<button
  class="context-menu-button"
  title="Open context menu (Click here, or right click on the selection)"
  on:click={handleClick}
>
  <Icon data={faCaretDown} />
</button>

<style src="./ContextMenuButton.scss"></style>
