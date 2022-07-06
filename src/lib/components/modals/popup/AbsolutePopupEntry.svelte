<script lang="ts">
  import type { AbsolutePopupOptions } from '../../../types'
  import { onMount, SvelteComponent } from 'svelte'
  import { isChildOf } from '../../../utils/domUtils'
  import { keyComboFromEvent } from '../../../utils/keyBindings'

  export let popupId: number
  export let popupComponent: SvelteComponent
  export let popupProps: Record<string, unknown>
  export let popupOptions: AbsolutePopupOptions
  export let closeAbsolutePopup: (popupId: number) => void

  let refRootPopup
  let refHiddenInput

  onMount(focus)

  function closeWhenOutside(event) {
    if (
      popupOptions &&
      popupOptions.closeOnOuterClick &&
      !isChildOf(event.target, (e) => e === refRootPopup)
    ) {
      closeAbsolutePopup(popupId)
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
      closeAbsolutePopup(popupId)
    }
  }

  function handleScrollWheel(event) {
    closeWhenOutside(event)
  }

  function calculateStyle(refRootPopup, popupOptions: AbsolutePopupOptions) {
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
</script>

<svelte:window
  on:mousedown|capture={handleWindowMouseDown}
  on:keydown|capture={handleKeyDown}
  on:wheel|capture={handleScrollWheel}
/>

<div
  bind:this={refRootPopup}
  class="jse-absolute-popup"
  on:mousedown={handleMouseDownInside}
  on:keydown={handleKeyDown}
>
  {#if refRootPopup}
    <div class="jse-absolute-popup-content" style={calculateStyle(refRootPopup, popupOptions)}>
      <input bind:this={refHiddenInput} class="jse-hidden-input" />
      <svelte:component this={popupComponent} {...popupProps} />
    </div>
  {/if}
</div>

<style src="./AbsolutePopupEntry.scss"></style>
