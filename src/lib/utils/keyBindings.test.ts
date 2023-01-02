import { strictEqual } from 'assert'
import { keyComboFromEvent } from './keyBindings.js'

describe('keyBindings', () => {
  it('keyComboFromEvent', () => {
    const ctrlKey = true
    const shiftKey = true
    const altKey = true
    const metaKey = true

    strictEqual(keyComboFromEvent(fakeEvent({ key: 'a' })), 'A')
    strictEqual(keyComboFromEvent(fakeEvent({ key: 'A' })), 'A')
    strictEqual(keyComboFromEvent(fakeEvent({ key: '=' })), '=')
    strictEqual(keyComboFromEvent(fakeEvent({ shiftKey, key: '+' })), 'Shift++')
    strictEqual(keyComboFromEvent(fakeEvent({ altKey, key: '=' })), 'Alt+=')
    strictEqual(keyComboFromEvent(fakeEvent({ key: '-' })), '-')
    strictEqual(keyComboFromEvent(fakeEvent({ shiftKey, key: '-' })), 'Shift+-')
    strictEqual(keyComboFromEvent(fakeEvent({ ctrlKey, key: 'a' })), 'Ctrl+A')
    strictEqual(keyComboFromEvent(fakeEvent({ metaKey, key: 'a' })), 'Ctrl+A')
    strictEqual(keyComboFromEvent(fakeEvent({ shiftKey, key: 'a' })), 'Shift+A')
    strictEqual(keyComboFromEvent(fakeEvent({ ctrlKey, shiftKey, key: 'a' })), 'Ctrl+Shift+A')
    strictEqual(keyComboFromEvent(fakeEvent({ key: 'Control' })), '') // does not happen in practice
    strictEqual(keyComboFromEvent(fakeEvent({ ctrlKey, key: 'Control' })), 'Ctrl')
  })
})

function fakeEvent(props: Record<string, unknown>): KeyboardEvent {
  return props as unknown as KeyboardEvent
}
