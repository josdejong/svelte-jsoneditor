// inspiration: https://github.com/andrepolischuk/keycomb

import { isMacDevice } from './navigatorUtils.js'

// KeyComboEvent is a subset of KeyboardEvent
export interface KeyComboEvent {
  ctrlKey: boolean
  metaKey: boolean
  altKey: boolean
  shiftKey: boolean
  key: string
}

/**
 * Get the active key combination from a keyboard event.
 * For example returns "Ctrl+Shift+ArrowUp" or "Ctrl+A"
 *
 * Returns the same output on both Windows and Mac:
 * meta keys "Ctrl" ("Command" on Mac), and "Alt" ("Alt" or "Option" on Mac)
 * So pressing "Command" and "A"on Mac will return "Ctrl+A"
 */
export function keyComboFromEvent(
  event: KeyComboEvent,
  separator = '+',
  isMac = isMacDevice
): string {
  const combi = []

  if (isCtrlKeyDown(event, isMac)) {
    // on Mac this is called Command or Cmd
    combi.push('Ctrl')
  }
  if (event.altKey) {
    // on Mac this is called Option
    combi.push('Alt')
  }
  if (event.shiftKey) {
    combi.push('Shift')
  }

  const keyName = event.key.length === 1 ? event.key.toUpperCase() : event.key
  if (!(keyName in metaKeys)) {
    // prevent output like 'Ctrl+Ctrl'
    combi.push(keyName)
  }

  return combi.join(separator)
}

/**
 * Test whether the Ctrl key (windows, linux) or Command key (mac) is down
 */
export function isCtrlKeyDown(
  event: { ctrlKey: boolean; metaKey: boolean },
  isMac = isMacDevice
): boolean {
  // metaKey is the Command key ⌘ on a Mac (but the Windows Key ⊞ on Windows)
  return event.ctrlKey || (event.metaKey && isMac())
}

const metaKeys = {
  Ctrl: true,
  Command: true,
  Control: true,
  Alt: true,
  Option: true,
  Shift: true
}
