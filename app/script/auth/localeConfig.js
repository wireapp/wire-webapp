import {getURLParameter} from './Environment';

export const SUPPORTED_LANGUAGE = require('./supportedLocales');

export const DEFAULT_LANGUAGE = 'en';

export function getLocale() {
  return navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language;
}

export function currentLanguage() {
  const LANGUAGE_SHORTHAND_LENGTH = 2;
  const languageParam = getURLParameter('hl');
  return languageParam || getLocale().substr(0, LANGUAGE_SHORTHAND_LENGTH) || DEFAULT_LANGUAGE;
}
