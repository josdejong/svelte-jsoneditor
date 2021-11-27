/**
 * Create a lightweight debug function to log output into the browser console.
 *
 * Inspired by https://github.com/visionmedia/debug (some code is copied below)
 *
 * Usage:
 *
 *     import { createDebug } from './debug.js'
 *
 *     const debug = createDebug('my:namespace')
 *
 *     debug('testing:', 2 + 2)
 *
 * By default, logging is only enabled when a property DEBUG is set in the
 * in the localStorage of your browser:
 *
 *     localStorage['debug'] = '*'
 *
 * The actual value of 'debug' is not used. You can choose other conditions to
 * enable/disable debugging if you want, for example some flag determining
 * whether in development or production.
 *
 *
 * @param {string} namespace
 * @param {boolean} [enabled]
 * @returns {function (...args: any) : void}
 */
export function createDebug(
  namespace,
  enabled = typeof window !== 'undefined' && window.localStorage['debug']
) {
  if (enabled) {
    const color = selectColor(namespace)

    return function debug(...args) {
      console.log(`%c${namespace}`, `color:${color}`, ...args)
    }
  } else {
    return noop
  }
}

function noop() {}

/**
 * Selects a color for a debug namespace
 *
 * Code is copied from the following source: https://github.com/visionmedia/debug
 *
 * @param {string} namespace The namespace string for the debug instance to be colored
 * @return {string} An ANSI color code for the given namespace
 */
function selectColor(namespace) {
  let hash = 0

  for (let i = 0; i < namespace.length; i++) {
    hash = (hash << 5) - hash + namespace.charCodeAt(i)
    hash |= 0 // Convert to 32bit integer
  }

  return colors[Math.abs(hash) % colors.length]
}

const colors = [
  '#0000CC',
  '#0099FF',
  '#009400',
  '#8dd200',
  '#CCCC00',
  '#CC9933',
  '#ae04e7',
  '#ff35d7',
  '#FF3333',
  '#FF6600',
  '#FF9933',
  '#FFCC33'
]
