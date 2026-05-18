import * as Localization from 'expo-localization';
import translations from '../locales/translations';

function getLanguage() {
  try {
    let lang = 'en';
    if (typeof Localization.getLocales === 'function') {
      const locales = Localization.getLocales();
      lang = locales?.[0]?.languageCode || 'en';
    } else if (Localization.locale) {
      lang = Localization.locale.split('-')[0];
    }
    lang = lang.toLowerCase().trim();
    return translations[lang] ? lang : 'en';
  } catch {
    return 'en';
  }
}

const lang = getLanguage();
const t = translations[lang] || translations['en'];

export function i18n(key, count) {
  if (count !== undefined && count !== 1 && t[`${key}_plural`]) {
    return t[`${key}_plural`];
  }
  // IMPORTANT: vérifie hasOwnProperty pour accepter les chaînes vides ''
  if (Object.prototype.hasOwnProperty.call(t, key)) return t[key];
  if (Object.prototype.hasOwnProperty.call(translations['en'], key)) return translations['en'][key];
  return key;
}

export { lang };
export default i18n;
