import {getURLParameter} from './util/urlUtil';

export const SUPPORTED_LANGUAGE = require('./supportedLocales');

export const DEFAULT_CURRENCY = 'eur';
export const DEFAULT_LANGUAGE = 'en';

const QUERY = {
  CURRENCY: 'currency',
  LANGUAGE: 'hl',
};

function getLocale() {
  return navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language;
}

export function currentLanguage() {
  const LANGUAGE_SHORTHAND_LENGTH = 2;
  return getURLParameter(QUERY.LANGUAGE) || getLocale().substr(0, LANGUAGE_SHORTHAND_LENGTH) || DEFAULT_LANGUAGE;
}

export function currentCurrency() {
  return getURLParameter(QUERY.CURRENCY) || DEFAULT_CURRENCY;
}
