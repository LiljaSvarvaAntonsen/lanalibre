import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import es from './locales/es.json';
import en from './locales/en.json';
import nb from './locales/nb.json';

const SUPPORTED = ['es', 'en', 'nb'];
const deviceLang = getLocales()[0]?.languageCode ?? 'es';
const lng = SUPPORTED.includes(deviceLang) ? deviceLang : 'es';

i18n.use(initReactI18next).init({
  resources: {
    es: { translation: es },
    en: { translation: en },
    nb: { translation: nb },
  },
  lng,
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
});

export default i18n;
