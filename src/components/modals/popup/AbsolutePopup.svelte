<svelte:options immutable={true} />

<script>
  import createDebug from 'debug'
  import { setContext, tick } from 'svelte'
  import { isChildOf } from '../../../utils/domUtils.js'
  import { keyComboFromEvent } from '../../../utils/keyBindings.js'

  const debug = createDebug('jsoneditor:AbsolutePopup')

  let popupComponent = null
  let popupProps = null
  let popupOptions = {}

  let refAbsolutePopup
  let refHiddenInput

  function openAbsolutePopup (Component, props, options) {
    debug('open...', options)
    popupComponent = Component
    popupProps = props || {}
    popupOptions = options || {}

    tick().then(focus)
  }

  function closeAbsolutePopup () {
    if (popupComponent) {
      const onClose = popupOptions.onClose

      popupComponent = null
      popupProps = null
      popupOptions = {}

      if (onClose) {
        onClose()
      }
    }
  }

  function handleWindowMouseDown (event) {
    if (
      popupOptions &&
      popupOptions.closeOnOuterClick &&
      !isChildOf(event.target, (e) => e === refAbsolutePopup)
    ) {
      closeAbsolutePopup()
    }
  }

  function handleMouseDownInside (event) {
    event.stopPropagation()
  }

  function handleKeyDown (event) {
    const combo = keyComboFromEvent(event)
    if (combo === 'Escape') {
      closeAbsolutePopup()
    }
  }

  function handleScrollWheel () {
    closeAbsolutePopup()
  }

  function calculateStyle () {
    const rect = refAbsolutePopup.getBoundingClientRect()

    return `left: ${popupOptions.left - rect.left}px; top: ${popupOptions.top - rect.top}px;`
  }

  function focus () {
    if (refHiddenInput) {
      refHiddenInput.focus()
    }
  }

  setContext('absolute-popup', { openAbsolutePopup, closeAbsolutePopup })
</script>

<svelte:window
  on:mousedown|capture={handleWindowMouseDown}
  on:keydown|capture={handleKeyDown}
  on:wheel|capture={handleScrollWheel}
/>

<div
  bind:this={refAbsolutePopup}
  class="absolute-popup"
  on:mousedown={handleMouseDownInside}
  on:keydown={handleKeyDown}
>
  {#if popupComponent && popupProps}
    <div
      class="absolute-popup-content"
      style={calculateStyle()}
    >
      <input bind:this={refHiddenInput} class="hidden-input" />
      <svelte:component this={popupComponent} {...popupProps} />
    </div>
  {/if}
</div>

<slot />

<style src="./AbsolutePopup.scss"></style>
