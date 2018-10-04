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

export const SUPPORTED_LANGUAGE = require('./supportedLocales');

// TODO: Use "Currency.EUR" here once core v6 is in.
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
