<script>
  import createDebug from 'debug'
  import { setContext } from 'svelte'
  import { keyComboFromEvent } from '../../../utils/keyBindings.js'

  const debug = createDebug('jsoneditor:AbsolutePopup')

  let popupComponent = null
  let popupProps = null
  let popupOptions = {}
  let refAbsolutePopup

  function openAbsolutePopup(Component, props, options) {
    debug('open...', options)
    popupComponent = Component
    popupProps = props || {}
    popupOptions = options || {}
  }

  function closeAbsolutePopup() {
    popupComponent = null
    popupProps = null
    popupOptions = {}
  }

  function handleClickOutside (event) {
    if (popupComponent && popupOptions.closeOnOuterClick) {
      closeAbsolutePopup()

      event.stopPropagation()
      event.preventDefault()
    }
  }

  function handleMouseDownInside (event) {
    event.stopPropagation()
  }

  // TODO: implement Escape to close the popup

  function calculateStyle() {
    const rect = refAbsolutePopup.getBoundingClientRect()

    return `left: ${popupOptions.left - rect.left}px; top: ${popupOptions.top - rect.top}px;`
  }

  setContext('absolute-popup', { openAbsolutePopup, closeAbsolutePopup })
</script>

{#if popupComponent && popupOptions.closeOnOuterClick}
  <div
    class="absolute-popup-overlay"
    on:click={handleClickOutside}
    on:contextmenu={handleClickOutside}
  ></div>
{/if}

<div
  bind:this={refAbsolutePopup}
  class="absolute-popup"
  on:mousedown={handleMouseDownInside}
>
  {#if popupComponent && popupProps}
    <div
      class="absolute-popup-content"
      style={calculateStyle()}
    >
      <svelte:component this={popupComponent} {...popupProps} />
    </div>
  {/if}
</div>

<slot />

<style src="./AbsolutePopup.scss"></style>
