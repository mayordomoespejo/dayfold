import { createContext, useContext, useState, type ReactNode } from 'react'
import i18n, { SUPPORTED_LANGS } from '@/i18n'
import { CONTENT_LANGS, CONTENT_LANG_KEY, resolveInitialContentLang } from '@/config/langs'

interface ContentLangContextValue {
  contentLang: string
  setContentLang: (lang: string) => void
}

const ContentLangContext = createContext<ContentLangContextValue | null>(null)

export function ContentLangProvider({ children }: { children: ReactNode }) {
  const [contentLang, setContentLangState] = useState<string>(resolveInitialContentLang)

  const setContentLang = (lang: string) => {
    if (!CONTENT_LANGS.some((l) => l.code === lang)) return
    localStorage.setItem(CONTENT_LANG_KEY, lang)
    setContentLangState(lang)
    // Sync UI language when the selected language has translations
    const uiLang = (SUPPORTED_LANGS as readonly string[]).includes(lang) ? lang : i18n.language
    void i18n.changeLanguage(uiLang)
  }

  return (
    <ContentLangContext.Provider value={{ contentLang, setContentLang }}>
      {children}
    </ContentLangContext.Provider>
  )
}

export function useContentLang() {
  const ctx = useContext(ContentLangContext)
  if (!ctx) throw new Error('useContentLang must be used within ContentLangProvider')
  return ctx
}
