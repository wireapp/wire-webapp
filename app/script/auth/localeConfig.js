import {getURLParameter} from './util/urlUtil';
import {QUERY_KEY} from './route';

export const SUPPORTED_LANGUAGE = require('./supportedLocales');

export const DEFAULT_CURRENCY = 'EUR';
export const DEFAULT_LANGUAGE = 'en';

function getLocale() {
  return navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language;
}

export function currentLanguage() {
  const LANGUAGE_SHORTHAND_LENGTH = 2;
  return getURLParameter(QUERY_KEY.LANGUAGE) || getLocale().substr(0, LANGUAGE_SHORTHAND_LENGTH) || DEFAULT_LANGUAGE;
}

export function currentCurrency() {
  return getURLParameter(QUERY_KEY.CURRENCY).toUpperCase() || DEFAULT_CURRENCY;
}
