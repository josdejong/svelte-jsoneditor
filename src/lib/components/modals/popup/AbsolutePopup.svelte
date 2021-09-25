<svelte:options immutable={true} />

<script>
  import createDebug from 'debug'
  import { setContext, tick } from 'svelte'
  import { isChildOf } from '$lib/utils/domUtils'
  import { keyComboFromEvent } from '$lib/utils/keyBindings'

  const debug = createDebug('jsoneditor:AbsolutePopup')

  let popupComponent = null
  let popupProps = null
  let popupOptions = {}

  let refRootPopup
  let refHiddenInput

  function openAbsolutePopup(Component, props, options) {
    debug('open...', options)
    popupComponent = Component
    popupProps = props || {}
    popupOptions = options || {}

    tick().then(focus)
  }

  function closeAbsolutePopup() {
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

  function closeWhenOutside(event) {
    if (
      popupOptions &&
      popupOptions.closeOnOuterClick &&
      !isChildOf(event.target, (e) => e === refRootPopup)
    ) {
      closeAbsolutePopup()
    }
  }

  function handleWindowMouseDown(event) {
    closeWhenOutside(event)
  }

  function handleMouseDownInside(event) {
    event.stopPropagation()
  }

  function handleKeyDown(event) {
    const combo = keyComboFromEvent(event)
    if (combo === 'Escape') {
      closeAbsolutePopup()
    }
  }

  function handleScrollWheel(event) {
    closeWhenOutside(event)
  }

  function calculateStyle() {
    function calculatePosition() {
      if (popupOptions.anchor) {
        const {
          anchor,
          width = 0,
          height = 0,
          offsetTop = 0,
          offsetLeft = 0,
          position
        } = popupOptions
        const { left, top, bottom, right } = anchor.getBoundingClientRect()

        const positionAbove =
          position === 'top' || (top + height > window.innerHeight && top > height)
        const positionLeft =
          position === 'left' || (left + width > window.innerWidth && left > width)

        return {
          left: positionLeft ? right - offsetLeft : left + offsetLeft,
          top: positionAbove ? top - offsetTop : bottom + offsetTop,
          positionAbove,
          positionLeft
        }
      } else if (typeof popupOptions.left === 'number' && typeof popupOptions.top === 'number') {
        const { left, top, width = 0, height = 0 } = popupOptions

        const positionAbove = top + height > window.innerHeight && top > height
        const positionLeft = left + width > window.innerWidth && left > width

        return {
          left,
          top,
          positionAbove,
          positionLeft
        }
      } else {
        throw new Error('Invalid config: pass either "left" and "top", or pass "anchor"')
      }
    }

    const rootRect = refRootPopup.getBoundingClientRect()
    const { left, top, positionAbove, positionLeft } = calculatePosition()

    const verticalStyling = positionAbove
      ? `bottom: ${rootRect.top - top}px;`
      : `top: ${top - rootRect.top}px;`

    const horizontalStyling = positionLeft
      ? `right: ${rootRect.left - left}px;`
      : `left: ${left - rootRect.left}px;`

    return verticalStyling + horizontalStyling
  }

  function focus() {
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
  bind:this={refRootPopup}
  class="absolute-popup"
  on:mousedown={handleMouseDownInside}
  on:keydown={handleKeyDown}
>
  {#if popupComponent && popupProps}
    <div class="absolute-popup-content" style={calculateStyle()}>
      <input bind:this={refHiddenInput} class="hidden-input" />
      <svelte:component this={popupComponent} {...popupProps} />
    </div>
  {/if}
</div>

<slot />

<style src="./AbsolutePopup.scss"></style>
