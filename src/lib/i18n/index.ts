import { getContext, hasContext, setContext } from 'svelte'
import type { Language, TranslationKey } from '$lib/types'
import { get, type Writable, writable } from 'svelte/store'

export const I18N_CONTEXT_KEY = Symbol('i18n')
type I18nContext = {
  landCode: Writable<string>
  values: Writable<Record<string, string>>
}
export function setI18nContext(language: Language) {
  if (hasContext(I18N_CONTEXT_KEY)) {
    const ctx = getContext<I18nContext>(I18N_CONTEXT_KEY)
    ctx.landCode.set(language.landCode)
    ctx.values.set({ ...language.values })
    return ctx
  }

  const ctx: I18nContext = {
    landCode: writable(language.landCode),
    values: writable({ ...language.values })
  }
  return setContext(I18N_CONTEXT_KEY, ctx)
}

export function getI18nContext() {
  return getContext<I18nContext>(I18N_CONTEXT_KEY)
}

export function t(key: keyof TranslationKey, params?: Record<string, string>): string {
  const ctx = getI18nContext()
  let translation: string = get(ctx.values)?.[key] ?? key

  if (params) {
    for (const param in params) {
      translation = translation.replace(new RegExp(`{{${param}}}`, 'g'), params[param])
    }
  }

  return translation
}

export * from './locales'
