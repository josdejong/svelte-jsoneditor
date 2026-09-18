import type { Language, Locale, TranslationKey } from '$lib/types'
import { derived, get, type Writable, writable } from 'svelte/store'
import { stringReplaceAll } from '$lib/utils/stringUtils.js'
import { english } from './locales/english.js'

export const i18nLangCode: Writable<string> = writable(english.langCode)
export const i18nValues: Writable<Locale> = writable({ ...english.values })

export function setI18nData(lang: Language) {
  i18nLangCode.set(lang.langCode)
  i18nValues.set({ ...lang.values })
}

function applyParams(template: string, params?: Record<string, string>) {
  if (!params) return template
  let out = template
  for (const p in params) out = stringReplaceAll(out, `{{${p}}}`, params[p])
  return out
}

export function tString(key: keyof TranslationKey, params?: Record<string, string>): string {
  const translation = get(i18nValues)[key] ?? english.values?.[key] ?? key
  return applyParams(translation, params)
}

const $t = derived(i18nValues, ($values) => {
  return (key: keyof TranslationKey, params?: Record<string, string>) => {
    const base = $values[key] ?? english.values?.[key] ?? key
    return applyParams(base, params)
  }
})

export { $t as t }
