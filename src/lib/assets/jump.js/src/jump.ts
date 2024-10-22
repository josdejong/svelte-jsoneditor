import easeInOutQuad from './easing.js'

type Easing = (t: number, b: number, c: number, d: number) => number
type Duration = number | ((distance: number) => number)

interface JumpOptions {
  duration?: Duration
  offset?: number
  callback?: () => void
  easing?: Easing
  a11y?: boolean
  container?: Element | string
}

export const createJump = () => {
  // private variable cache
  // no variables are created during a jump, preventing memory leaks

  let container: Element // container element to be scrolled       (node)
  let element: Element | undefined // element to scroll to                   (node)

  let start: number // where scroll starts                    (px)
  let stop: number // where scroll stops                     (px)

  let offset // adjustment from the stop position      (px)
  let easing: Easing // easing function                        (function)
  let a11y: boolean // accessibility support flag             (boolean)

  let distance: number // distance of scroll                     (px)
  let duration: number // scroll duration                        (ms)

  let timeStart: number // time scroll started                    (ms)
  let timeElapsed: number // time spent scrolling thus far          (ms)

  let next: number // next scroll position                   (px)

  let callback: (() => void) | undefined // to call when done scrolling            (function)

  let scrolling: boolean // true whilst scrolling                  (boolean)

  // scroll position helper

  function location() {
    return container.scrollTop
  }

  // element offset helper

  function top(element: Element) {
    const elementTop = element.getBoundingClientRect().top
    const containerTop = container.getBoundingClientRect ? container.getBoundingClientRect().top : 0

    return elementTop - containerTop + start
  }

  // scrollTo helper

  function scrollTo(top: number) {
    if (container.scrollTo) {
      container.scrollTo(container.scrollLeft, top) // window
    } else {
      container.scrollTop = top // custom container
    }
  }

  // rAF loop helper

  function loop(timeCurrent: number) {
    // store time scroll started, if not started already
    if (!timeStart) {
      timeStart = timeCurrent
    }

    // determine time spent scrolling so far
    timeElapsed = timeCurrent - timeStart

    // calculate next scroll position
    next = easing(timeElapsed, start, distance, duration)

    // scroll to it
    scrollTo(next)

    scrolling = true

    // check progress
    if (timeElapsed < duration) {
      requestAnimationFrame(loop) // continue scroll loop
    } else {
      done() // scrolling is done
    }
  }

  // scroll finished helper

  function done() {
    // account for rAF time rounding inaccuracies
    scrollTo(start + distance)

    // if scrolling to an element, and accessibility is enabled
    if (element && a11y) {
      // add tabindex indicating programmatic focus
      element.setAttribute('tabindex', '-1')

      // focus the element
      const htmlElement = element as HTMLElement
      htmlElement.focus()
    }

    // if it exists, fire the callback
    if (typeof callback === 'function') {
      callback()
    }

    // reset time for next jump
    timeStart = 0

    // we're done scrolling
    scrolling = false
  }

  // API

  function jump(target: Element | number | string, options: JumpOptions = {}) {
    // resolve options, or use defaults
    duration = 1000
    offset = options.offset || 0
    callback = options.callback // "undefined" is a suitable default, and won't be called
    easing = options.easing || easeInOutQuad
    a11y = options.a11y || false

    // resolve container
    switch (typeof options.container) {
      case 'object':
        // we assume container is an HTML element (Node)
        container = options.container
        break

      case 'string':
        container = document.querySelector(options.container) as Element
        break

      default:
        container = window.document.documentElement
    }

    // cache starting position
    start = location()

    // resolve target
    switch (typeof target) {
      // scroll from current position
      case 'number':
        element = undefined // no element to scroll to
        a11y = false // make sure accessibility is off
        stop = start + target
        break

      // scroll to element (node)
      // bounding rect is relative to the viewport
      case 'object':
        element = target
        stop = top(element)
        break

      // scroll to element (selector)
      // bounding rect is relative to the viewport
      case 'string':
        element = document.querySelector(target) as unknown as Element
        stop = top(element)
        break

      default:
    }

    // resolve scroll distance, accounting for offset
    distance = stop - start + offset

    // resolve duration
    switch (typeof options.duration) {
      // number in ms
      case 'number':
        duration = options.duration
        break

      // function passed the distance of the scroll
      case 'function':
        duration = options.duration(distance)
        break

      default:
    }

    // start the loop if we're not already scrolling
    if (!scrolling) {
      requestAnimationFrame(loop)
    } else {
      // reset time for next jump
      timeStart = 0
    }
  }

  // expose only the jump method
  return jump
}

// export singleton

const singleton = createJump()

export default singleton
