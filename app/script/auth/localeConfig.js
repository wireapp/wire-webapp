export const SUPPORTED_LANGUAGE = [
  'cs',
  'da',
  'de',
  'el',
  'es',
  'et',
  'fi',
  'fr',
  'hr',
  'hu',
  'it',
  'lt',
  'nl',
  'pl',
  'pt',
  'ro',
  'ru',
  'sk',
  'sl',
  'tr',
  'uk',
];
export const DEFAULT_LANGUAGE = 'en';

export function getLocale() {
  return navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language;
}

export function currentLanguage() {
  const LANGUAGE_SHORTHAND_LENGTH = 2;
  const languageParam = new URL(window.location).searchParams.get('hl');
  return languageParam || getLocale().substr(0, LANGUAGE_SHORTHAND_LENGTH) || DEFAULT_LANGUAGE;
}
