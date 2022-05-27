import Tooltip from './Tooltip.svelte'

export function tooltip(node: Element, { text, openAbsolutePopup, closeAbsolutePopup }) {
  function handleMouseOver() {
    const props = {
      text //: validationError.isChildError ? 'Contains invalid data' : validationError.message
    }

    openAbsolutePopup(Tooltip, props, {
      position: 'top',
      width: 10 * text.length, // rough estimate of the width of the message
      offsetTop: 3,
      anchor: node,
      closeOnOuterClick: true
    })
  }

  function handleMouseOut() {
    closeAbsolutePopup()
  }

  node.addEventListener('mouseover', handleMouseOver)
  node.addEventListener('mouseout', handleMouseOut)

  return {
    destroy() {
      node.removeEventListener('mouseover', handleMouseOver)
      node.removeEventListener('mouseout', handleMouseOut)
    }
  }
}
