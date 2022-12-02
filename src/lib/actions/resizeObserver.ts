/**
 * Custom Svelte action
 *  - Uses Resize Observer API
 *  - Dispatch custom event when element is resized
 *
 * Example usage: `<div use:watchResize on:resize={handleResize}></div>`
 *
 * Source: https://github.com/jnruel/svelte-observe-resize
 */
export function resizeObserver(node: HTMLElement): { destroy: () => void } {
  const observer = getSingletonResizeObserver()

  observer.observe(node)

  return {
    destroy() {
      observer.unobserve(node)
    }
  }
}

// Singleton observer for all nodes
function getSingletonResizeObserver() {
  if (!_singletonResizeObserver) {
    _singletonResizeObserver = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        entry.target.dispatchEvent(new CustomEvent('resize', { detail: entry }))
      })
    })
  }

  return _singletonResizeObserver
}

let _singletonResizeObserver: ResizeObserver | undefined
