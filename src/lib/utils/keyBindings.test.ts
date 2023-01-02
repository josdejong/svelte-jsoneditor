import { strictEqual } from 'assert'
import { keyComboFromEvent } from './keyBindings.js'

describe('keyBindings', () => {
  const ctrlKey = true
  const shiftKey = true
  const altKey = true
  const metaKey = true

  it('keyComboFromEvent', () => {
    strictEqual(keyComboFromEvent({ key: 'a' }), 'A')
    strictEqual(keyComboFromEvent({ key: 'A' }), 'A')
    strictEqual(keyComboFromEvent({ key: '=' }), '=')
    strictEqual(keyComboFromEvent({ shiftKey, key: '+' }), 'Shift++')
    strictEqual(keyComboFromEvent({ altKey, key: '=' }), 'Alt+=')
    strictEqual(keyComboFromEvent({ key: '-' }), '-')
    strictEqual(keyComboFromEvent({ shiftKey, key: '-' }), 'Shift+-')
    strictEqual(keyComboFromEvent({ ctrlKey, key: 'a' }), 'Ctrl+A')
    strictEqual(keyComboFromEvent({ metaKey, key: 'a' }), 'Ctrl+A')
    strictEqual(keyComboFromEvent({ shiftKey, key: 'a' }), 'Shift+A')
    strictEqual(keyComboFromEvent({ ctrlKey, shiftKey, key: 'a' }), 'Ctrl+Shift+A')
    strictEqual(keyComboFromEvent({ key: 'Control' }), '') // does not happen in practice
    strictEqual(keyComboFromEvent({ ctrlKey, key: 'Control' }), 'Ctrl')
  })

  it('keyComboFromEvent with custom separator', () => {
    const separator = '///'
    strictEqual(keyComboFromEvent({ key: 'a' }, separator), 'A')
    strictEqual(keyComboFromEvent({ ctrlKey, key: 'a' }, separator), 'Ctrl///A')
    strictEqual(keyComboFromEvent({ ctrlKey, shiftKey, key: 'A' }, separator), 'Ctrl///Shift///A')
  })
})
