import { test, describe } from 'vitest'
import { strictEqual } from 'assert'
import { keyComboFromEvent } from './keyBindings.js'

describe('keyBindings', () => {
  const ctrlKey = true
  const shiftKey = true
  const altKey = true
  const metaKey = true

  const defaults = { ctrlKey: false, shiftKey: false, altKey: false, metaKey: false }

  test('keyComboFromEvent', () => {
    strictEqual(keyComboFromEvent({ ...defaults, key: 'a' }), 'A')
    strictEqual(keyComboFromEvent({ ...defaults, key: 'A' }), 'A')
    strictEqual(keyComboFromEvent({ ...defaults, key: '=' }), '=')
    strictEqual(keyComboFromEvent({ ...defaults, shiftKey, key: '+' }), 'Shift++')
    strictEqual(keyComboFromEvent({ ...defaults, altKey, key: '=' }), 'Alt+=')
    strictEqual(keyComboFromEvent({ ...defaults, key: '-' }), '-')
    strictEqual(keyComboFromEvent({ ...defaults, shiftKey, key: '-' }), 'Shift+-')
    strictEqual(keyComboFromEvent({ ...defaults, ctrlKey, key: 'a' }), 'Ctrl+A')
    strictEqual(
      keyComboFromEvent({ ...defaults, metaKey, key: 'a' }, '+', () => true),
      'Ctrl+A'
    )
    strictEqual(keyComboFromEvent({ ...defaults, shiftKey, key: 'a' }), 'Shift+A')
    strictEqual(keyComboFromEvent({ ...defaults, ctrlKey, shiftKey, key: 'a' }), 'Ctrl+Shift+A')
    strictEqual(keyComboFromEvent({ ...defaults, key: 'Control' }), '') // does not happen in practice
    strictEqual(keyComboFromEvent({ ...defaults, ctrlKey, key: 'Control' }), 'Ctrl')
  })

  test('keyComboFromEvent with custom separator', () => {
    const separator = '///'
    strictEqual(keyComboFromEvent({ ...defaults, key: 'a' }, separator), 'A')
    strictEqual(keyComboFromEvent({ ...defaults, ctrlKey, key: 'a' }, separator), 'Ctrl///A')
    strictEqual(
      keyComboFromEvent({ ...defaults, ctrlKey, shiftKey, key: 'A' }, separator),
      'Ctrl///Shift///A'
    )
  })
})
