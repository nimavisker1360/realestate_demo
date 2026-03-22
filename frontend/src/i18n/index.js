import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import enTranslations from './locales/en.json';
import trTranslations from './locales/tr.json';
import ruTranslations from './locales/ru.json';
import {
  DEFAULT_LANGUAGE_CODE,
  SUPPORTED_LANGUAGE_CODES
} from '../utils/languageRouting';

const resources = {
  en: {
    translation: enTranslations
  },
  tr: {
    translation: trTranslations
  },
  ru: {
    translation: ruTranslations
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LANGUAGE_CODES,
    fallbackLng: DEFAULT_LANGUAGE_CODE,
    debug: false,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['path', 'localStorage', 'navigator'],
      lookupFromPathIndex: 0,
      caches: ['localStorage']
    }
  });

export default i18n;
