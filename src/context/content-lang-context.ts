import { createContext } from 'react'

export interface ContentLangContextValue {
  contentLang: string
  setContentLang: (lang: string) => void
}

export const ContentLangContext = createContext<ContentLangContextValue | null>(null)
