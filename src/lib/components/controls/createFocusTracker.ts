import { createDebug } from '$lib/utils/debug.js'

const debug = createDebug('jsoneditor:FocusTracker')

export interface FocusTrackerProps {
  onMount: (callback: () => void) => void
  onDestroy: (callback: () => void) => void
  getWindow: () => Window | undefined
  hasFocus: () => boolean
  onFocus: () => void
  onBlur: () => void
}

export function createFocusTracker({
  onMount,
  onDestroy,
  getWindow,
  hasFocus,
  onFocus,
  onBlur
}: FocusTrackerProps) {
  let blurTimeoutHandle: number | undefined
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
        if (!hasFocus()) {
          debug('blur')
          focus = false
          onBlur()
        }
      }) as unknown as number
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
