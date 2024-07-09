type Callback = () => void

/**
 * The provided callback is invoked when the user presses Escape, and then stops propagation of the event.
 */
export function onEscape(element: HTMLElement | undefined, callback: Callback) {
  if (!element) {
    return undefined
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      callback()
    }
  }

  element.addEventListener('keydown', handleKeyDown)

  return {
    destroy() {
      element.removeEventListener('keydown', handleKeyDown)
    }
  }
}
