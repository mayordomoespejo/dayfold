export interface LangOption {
  code: string
  label: string
}

/**
 * Wikipedia language editions currently supported by Wikimedia's
 * "On this day in history" feed and available in this app.
 * Sorted alphabetically by code.
 */
export const CONTENT_LANGS: readonly LangOption[] = [
  { code: 'ar', label: 'العربية' },
  { code: 'de', label: 'Deutsch' },
  { code: 'en', label: 'English' },
  { code: 'es', label: 'Español' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'pt', label: 'Português' },
  { code: 'sv', label: 'Svenska' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'uk', label: 'Українська' },
  { code: 'zh', label: '中文' },
] as const

export const CONTENT_LANG_KEY = 'cl_content_lang'

/**
 * Resolves the initial content language:
 * stored value → device locale → 'en'.
 */
export function resolveInitialContentLang(): string {
  const stored = localStorage.getItem(CONTENT_LANG_KEY)
  if (stored && CONTENT_LANGS.some((l) => l.code === stored)) return stored

  const deviceLang = navigator.language.split('-')[0]
  if (CONTENT_LANGS.some((l) => l.code === deviceLang)) return deviceLang

  return 'en'
}
