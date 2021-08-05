<script>
  import { faCaretDown } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'
  import {
    CONTEXT_MENU_EXPLANATION,
    CONTEXT_MENU_HEIGHT,
    CONTEXT_MENU_WIDTH
  } from '../../../../constants.js'

  export let selected
  export let onContextMenu

  function handleClick(event) {
    let buttonElem = event.target
    while (buttonElem && buttonElem.nodeName !== 'BUTTON') {
      buttonElem = buttonElem.parentNode
    }

    if (buttonElem) {
      onContextMenu({
        anchor: buttonElem,
        width: CONTEXT_MENU_WIDTH,
        height: CONTEXT_MENU_HEIGHT,
        offsetTop: 2
      })
    }
  }
</script>

<button
  type="button"
  class="context-menu-button"
  class:selected
  title={CONTEXT_MENU_EXPLANATION}
  on:click={handleClick}
>
  <Icon data={faCaretDown} />
</button>

<style src="./ContextMenuButton.scss"></style>
