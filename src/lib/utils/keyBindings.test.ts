import { strictEqual } from 'assert'
import { keyComboFromEvent, nameFromKeyCode } from './keyBindings.js'

describe('keyBindings', () => {
  it('nameFromKeyCode', () => {
    strictEqual(nameFromKeyCode(65), 'A')
    strictEqual(nameFromKeyCode(13), 'Enter')
    strictEqual(nameFromKeyCode(100), 'Numpad_4')

    strictEqual(nameFromKeyCode(186), ';')
    strictEqual(nameFromKeyCode(59), ';') // For Firefox
    strictEqual(nameFromKeyCode(187), '=')
    strictEqual(nameFromKeyCode(61), '=') // For Firefox
    strictEqual(nameFromKeyCode(189), '-')
    strictEqual(nameFromKeyCode(173), '-') // For Firefox
  })

  it('keyComboFromEvent', () => {
    const ctrlKey = true
    const shiftKey = true
    const altKey = true
    const metaKey = true

    strictEqual(keyComboFromEvent(fakeEvent({ which: 65 })), 'A')
    strictEqual(keyComboFromEvent(fakeEvent({ which: 187 })), '=')
    strictEqual(keyComboFromEvent(fakeEvent({ shiftKey, which: 187 })), 'Shift+=')
    strictEqual(keyComboFromEvent(fakeEvent({ altKey, which: 187 })), 'Alt+=')
    strictEqual(keyComboFromEvent(fakeEvent({ which: 189 })), '-')
    strictEqual(keyComboFromEvent(fakeEvent({ shiftKey, which: 189 })), 'Shift+-')
    strictEqual(keyComboFromEvent(fakeEvent({ ctrlKey, which: 65 })), 'Ctrl+A')
    strictEqual(keyComboFromEvent(fakeEvent({ metaKey, which: 65 })), 'Ctrl+A')
    strictEqual(keyComboFromEvent(fakeEvent({ shiftKey, which: 65 })), 'Shift+A')
    strictEqual(keyComboFromEvent(fakeEvent({ ctrlKey, shiftKey, which: 65 })), 'Ctrl+Shift+A')
    strictEqual(keyComboFromEvent(fakeEvent({ which: 17 })), '') // does not happen in practice
    strictEqual(keyComboFromEvent(fakeEvent({ ctrlKey, which: 17 })), 'Ctrl')
  })
})

function fakeEvent(props: Record<string, unknown>): KeyboardEvent {
  return props as unknown as KeyboardEvent
}
