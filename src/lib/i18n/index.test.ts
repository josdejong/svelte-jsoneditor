import { test, describe, afterEach } from 'vitest'
import assert from 'assert'
import { get } from 'svelte/store'
import { setI18nData, t, tString } from './index.js'
import { english, french, russian, simplifiedChinese } from './locales/index.js'
import type { Language } from '$lib/types'

describe('i18n', () => {
  afterEach(() => setI18nData(english))

  test('should translate a key', () => {
    assert.strictEqual(tString('cancel'), 'Cancel')

    setI18nData(russian)
    assert.strictEqual(tString('cancel'), 'Отмена')
  })

  test('should fill in params', () => {
    assert.strictEqual(
      tString('limitedToItems', { count: '100' }),
      english.values.limitedToItems.replace('{{count}}', '100')
    )
  })

  test('should replace all occurrences of a param', () => {
    const repeated: Language = {
      langCode: 'en-TEST',
      values: { ...english.values, cancel: '{{name}} and {{name}}' }
    }

    setI18nData(repeated)
    assert.strictEqual(tString('cancel', { name: 'x' }), 'x and x')
  })

  test('should fall back to english for a missing key', () => {
    const incomplete = {
      langCode: 'en-TEST',
      values: { ...english.values, cancel: undefined }
    } as unknown as Language

    setI18nData(incomplete)
    assert.strictEqual(tString('cancel'), 'Cancel')
  })

  test('should expose a reactive store', () => {
    assert.strictEqual(get(t)('cancel'), 'Cancel')

    setI18nData(russian)
    assert.strictEqual(get(t)('cancel'), 'Отмена')
  })

  test('should define the same keys in every language', () => {
    const expected = Object.keys(english.values).sort()

    for (const language of [french, russian, simplifiedChinese]) {
      assert.deepStrictEqual(Object.keys(language.values).sort(), expected, language.langCode)
    }
  })
})
