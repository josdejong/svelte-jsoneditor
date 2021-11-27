import { createDebug } from '../../utils/debug'
import {
  AUTO_SCROLL_INTERVAL,
  AUTO_SCROLL_SPEED_FAST,
  AUTO_SCROLL_SPEED_NORMAL,
  AUTO_SCROLL_SPEED_SLOW
} from '../../constants.js'

const debug = createDebug('jsoneditor:AutoScrollHandler')

export function createAutoScrollHandler(scrollableElement) {
  debug('createAutoScrollHandler', scrollableElement)

  let autoScrollSpeed // pixels per second
  let autoScrollTimer

  function calculateSpeed(diff) {
    return diff < 20
      ? AUTO_SCROLL_SPEED_SLOW
      : diff < 50
      ? AUTO_SCROLL_SPEED_NORMAL
      : AUTO_SCROLL_SPEED_FAST
  }

  function autoScrollCallback() {
    // debug('auto scroll...')
    const diff = autoScrollSpeed * (AUTO_SCROLL_INTERVAL / 1000)

    scrollableElement.scrollTop += diff
  }

  function startAutoScroll(speed) {
    if (!autoScrollTimer || speed !== autoScrollSpeed) {
      stopAutoScroll()

      debug('startAutoScroll', speed)
      autoScrollSpeed = speed
      autoScrollTimer = setInterval(autoScrollCallback, AUTO_SCROLL_INTERVAL)
    }
  }

  function stopAutoScroll() {
    if (autoScrollTimer) {
      debug('stopAutoScroll')

      clearInterval(autoScrollTimer)
      autoScrollTimer = undefined
      autoScrollSpeed = undefined
    }
  }

  function onDrag(event) {
    if (scrollableElement) {
      const y = event.clientY
      const { top, bottom } = scrollableElement.getBoundingClientRect()

      if (y < top) {
        const speed = calculateSpeed(top - y)
        startAutoScroll(-speed)
      } else if (y > bottom) {
        const speed = calculateSpeed(y - bottom)
        startAutoScroll(speed)
      } else {
        stopAutoScroll()
      }
    }
  }

  function onDragEnd() {
    stopAutoScroll()
  }

  return {
    onDrag,
    onDragEnd
  }
}
