/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program. If not, see http://www.gnu.org/licenses/.
 *
 */

import {QUERY_KEY} from './route';
import {getURLParameter} from './util/urlUtil';

export const SUPPORTED_LANGUAGES = require('./supportedLocales');

// TODO: Use "Currency.EUR" here once core v6 is in.
export const DEFAULT_CURRENCY = 'EUR';
export const DEFAULT_LANGUAGE = 'en-US';

function getLocale() {
  return mapLanguage(navigator.languages && navigator.languages.length ? navigator.languages[0] : navigator.language);
}

export function currentLanguage() {
  return mapLanguage(getURLParameter(QUERY_KEY.LANGUAGE)) || getLocale();
}

export function currentCurrency() {
  return getURLParameter(QUERY_KEY.CURRENCY).toUpperCase() || DEFAULT_CURRENCY;
}

export function normalizeLanguage(language: string = DEFAULT_LANGUAGE) {
  const LANGUAGE_SHORTHAND_LENGTH = 2;
  return language.substring(0, LANGUAGE_SHORTHAND_LENGTH);
}

export function mapLanguage(language: string = DEFAULT_LANGUAGE) {
  language = normalizeLanguage(language);
  switch (language) {
    case 'cs':
      return 'cs-CZ';
    case 'da':
      return 'da-DK';
    case 'de':
      return 'de-DE';
    case 'el':
      return 'el-GR';
    case 'es':
      return 'es-ES';
    case 'et':
      return 'et-EE';
    case 'fi':
      return 'fi-FI';
    case 'fr':
      return 'fr-FR';
    case 'hr':
      return 'hr-HR';
    case 'hu':
      return 'hu-HU';
    case 'it':
      return 'it-IT';
    case 'lt':
      return 'lt-LT';
    case 'nl':
      return 'nl-NL';
    case 'pl':
      return 'pl-PL';
    case 'pt':
      return 'pt-PT';
    case 'ro':
      return 'ro-RO';
    case 'ru':
      return 'ru-RU';
    case 'sk':
      return 'sk-SK';
    case 'sl':
      return 'sl-SI';
    case 'tr':
      return 'tr-TR';
    case 'uk':
      return 'uk-UA';
    case 'en':
    default:
      return 'en-US';
  }
}
