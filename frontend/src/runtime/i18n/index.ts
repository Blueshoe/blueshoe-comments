import type { CodeOfConductContent } from '../coc/code-of-conduct'
import type { I18nKey } from './en'
import { CODE_OF_CONDUCT_I18N } from '../coc/code-of-conduct'
import { de } from './de'
import { en } from './en'

const catalogs: Record<string, Record<I18nKey, string>> = { en, de }

export function resolveLang(lang?: string): 'en' | 'de' {
  if (lang?.startsWith('de'))
    return 'de'
  if (typeof document !== 'undefined' && document.documentElement.lang.startsWith('de'))
    return 'de'
  return 'en'
}

export type CommunityTranslateFn = (
  key: I18nKey,
  vars?: Record<string, string | number>,
) => string

export function useCommunityI18n(lang?: string) {
  const locale = resolveLang(lang)
  const catalog = catalogs[locale] || en

  const t: CommunityTranslateFn = (key, vars) => {
    let value = catalog[key] || en[key] || key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(`{${k}}`, String(v))
      }
    }
    return value
  }

  function coc(): CodeOfConductContent {
    return CODE_OF_CONDUCT_I18N[locale]
  }

  return { locale, t, coc }
}

export type { I18nKey }
