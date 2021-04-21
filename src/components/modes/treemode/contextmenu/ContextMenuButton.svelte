<script>
  import { faCaretDown } from '@fortawesome/free-solid-svg-icons'
  import Icon from 'svelte-awesome'

  export let onContextMenu

  function handleClick (event) {
    let buttonElem = event.target
    while (buttonElem && buttonElem.nodeName !== 'BUTTON') {
      buttonElem = buttonElem.parentNode
    }

    if (buttonElem) {
      const rect = buttonElem.getBoundingClientRect()

      onContextMenu({
        left: rect.left,
        top: rect.bottom + 2
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
