import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { APP_CONFIG } from '@/config/app'

import ar from './locales/ar.json'
import de from './locales/de.json'
import en from './locales/en.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import it from './locales/it.json'
import pt from './locales/pt.json'
import sv from './locales/sv.json'
import tr from './locales/tr.json'
import uk from './locales/uk.json'
import zh from './locales/zh.json'

export const SUPPORTED_LANGS = ['ar', 'de', 'en', 'es', 'fr', 'it', 'pt', 'sv', 'tr', 'uk', 'zh'] as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ar: { translation: ar },
      de: { translation: de },
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      it: { translation: it },
      pt: { translation: pt },
      sv: { translation: sv },
      tr: { translation: tr },
      uk: { translation: uk },
      zh: { translation: zh },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGS,
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: APP_CONFIG.languageStorageKey,
      caches: ['localStorage'],
    },
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
