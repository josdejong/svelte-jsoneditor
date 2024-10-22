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
 * localStorage of your browser:
 *
 *     localStorage['debug'] = '*'
 *     localStorage['debug'] = 'jsoneditor:*'
 *     localStorage['debug'] = 'jsoneditor:TreeMode'
 *
 * The actual value of 'debug' is used to filter the debug messages.
 * The value can end with a '*' wild card to match any remaining text.
 *
 * By providing a value for `enabled`, you can choose conditions to
 * enable/disable debugging if you want, for example some flag determining
 * whether in development or production.
 */
export function createDebug(
  namespace: string,
  enabled = enableDebug(namespace)
): (...args: unknown[]) => void {
  if (!enabled) {
    return noop
  }

  const color = selectColor(namespace)

  return function debug(...args) {
    console.log(`%c${namespace}`, `color:${color}`, ...args)
  }
}

function enableDebug(namespace: string) {
  const debug = tryReadLocalStorage('debug')

  return debug?.endsWith('*') ? namespace.startsWith(debug.slice(0, -1)) : namespace === debug
}

function noop() {
  // no operation
}

/**
 * Try read a specific key from localStorage
 */
function tryReadLocalStorage(key: string): string | undefined {
  try {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      // reading local storage can fail for example because of security restrictions
      return window.localStorage[key]
    }
  } catch {
    // we do nothing with the error, not needed in this specific case
  }

  return undefined
}

/**
 * Selects a color for a debug namespace
 *
 * Code is copied from the following source: https://github.com/visionmedia/debug
 *
 * @param namespace The namespace string for the debug instance to be colored
 * @return An ANSI color code for the given namespace
 */
function selectColor(namespace: string): string {
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
