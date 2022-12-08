// source: https://github.com/sveltejs/svelte/issues/7583

let observer: ResizeObserver
let callbacks: WeakMap<Element, (element: Element) => void>

/**
 * Example usage:
 *
 *   <script lang="ts">
 *      let clientWidth = 0
 *   </script>
 *
 *   <div use:resizeObserver={element => clientWidth = element.clientWidth}>
 *      My width is: {clientWidth}
 *   </div>
 */
export function resizeObserver(element: Element, onResize: (element: Element) => void) {
  if (!observer) {
    callbacks = new WeakMap()
    observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const onResize = callbacks.get(entry.target)
        if (onResize) {
          onResize(entry.target)
        }
      }
    })
  }

  callbacks.set(element, onResize)
  observer.observe(element)

  return {
    destroy: () => {
      callbacks.delete(element)
      observer.unobserve(element)
    }
  }
}
