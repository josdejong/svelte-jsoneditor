import createDebug from 'debug'

const debug = createDebug('jsoneditor:FocusTracker')

export function createFocusTracker({ onMount, onDestroy, getWindow, hasFocus, onFocus, onBlur }) {
  let blurTimeoutHandle
  let focus = false

  function handleFocusIn() {
    const newFocus = hasFocus()

    if (newFocus) {
      clearTimeout(blurTimeoutHandle)
      if (!focus) {
        debug('focus')
        onFocus()
        focus = newFocus
      }
    }
  }

  function handleFocusOut() {
    if (focus) {
      // We set focus to false after timeout. Often, you get a blur and directly
      // another focus when moving focus from one button to another.
      // The focusIn handler will cancel any pending blur timer in those cases
      clearTimeout(blurTimeoutHandle)
      blurTimeoutHandle = setTimeout(() => {
        debug('blur')
        focus = false
        onBlur()
      })
    }
  }

  onMount(() => {
    debug('mount FocusTracker')
    const window = getWindow()
    if (window) {
      window.addEventListener('focusin', handleFocusIn, true)
      window.addEventListener('focusout', handleFocusOut, true)
    }
  })

  onDestroy(() => {
    debug('destroy FocusTracker')
    const window = getWindow()
    if (window) {
      window.removeEventListener('focusin', handleFocusIn, true)
      window.removeEventListener('focusout', handleFocusOut, true)
    }
  })
}
