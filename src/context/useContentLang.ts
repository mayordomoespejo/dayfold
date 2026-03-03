import { useContext } from 'react'
import { ContentLangContext } from '@/context/content-lang-context'

export function useContentLang() {
  const ctx = useContext(ContentLangContext)
  if (!ctx) throw new Error('useContentLang must be used within ContentLangProvider')
  return ctx
}
