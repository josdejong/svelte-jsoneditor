import Tooltip from './Tooltip.svelte'

export function tooltip(node: Element, { text, openAbsolutePopup, closeAbsolutePopup }) {
  let visible = false

  function handleMouseOver() {
    const props = {
      text
    }

    // opening popup will fail if there is already a popup open
    visible = openAbsolutePopup(Tooltip, props, {
      position: 'top',
      width: 10 * text.length, // rough estimate of the width of the message
      offsetTop: 3,
      anchor: node,
      closeOnOuterClick: true
    })
  }

  function handleMouseOut() {
    if (visible) {
      closeAbsolutePopup()
    }
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
