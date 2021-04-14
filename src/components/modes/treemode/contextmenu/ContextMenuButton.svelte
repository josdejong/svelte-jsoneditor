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
  title="Open context menu (Click here, or right click anywhere)"
  on:click={handleClick}
>
  <Icon data={faCaretDown} />
</button>

<style lang="scss">
  @import '../../../../styles';

  .context-menu-button {
    $size: 18px;

    position: absolute;
    top: -$size/2;
    right: -$size/2;
    width: $size;
    height: $size;
    padding: 0;
    margin: 0;
    z-index: 2;

    cursor: pointer;
    background: transparent;
    font-size: $font-size-mono;
    line-height: $line-height;

    background: $dark-gray;
    color: $white;
    border: none;
    border-radius: 2px;
    box-shadow: $box-shadow;

    &:hover {
      background: lighten($dark-gray, 10%);
      color: $white;
    }
  }
</style>
