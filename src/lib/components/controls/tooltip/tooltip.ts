import Tooltip from './Tooltip.svelte'

export function tooltip(node: Element, { text, openAbsolutePopup, closeAbsolutePopup }) {
  let popupId: number | undefined

  function handleMouseEnter() {
    const props = {
      text
    }

    // opening popup will fail if there is already a popup open
    popupId = openAbsolutePopup(Tooltip, props, {
      position: 'top',
      width: 10 * text.length, // rough estimate of the width of the message
      offsetTop: 3,
      anchor: node,
      closeOnOuterClick: true
    })
  }

  function handleMouseLeave() {
    closeAbsolutePopup(popupId)
  }

  node.addEventListener('mouseenter', handleMouseEnter)
  node.addEventListener('mouseleave', handleMouseLeave)

  return {
    destroy() {
      node.removeEventListener('mouseenter', handleMouseEnter)
      node.removeEventListener('mouseleave', handleMouseLeave)
    }
  }
}
