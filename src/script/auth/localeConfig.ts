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

import {SupportedCurrency} from '@wireapp/api-client/lib/team/payment/';

import {UrlUtil} from '@wireapp/commons';

import {QUERY_KEY} from './route';
import {supportedLocales as Locales} from './supportedLocales';

const DEFAULT_CURRENCY = SupportedCurrency.EUR;
const DEFAULT_LANGUAGE = 'en-US';

function getLocale(): string {
  return mapLanguage(navigator.languages?.length ? navigator.languages[0] : navigator.language);
}

export function currentLanguage(): string {
  return mapLanguage(UrlUtil.getURLParameter(QUERY_KEY.LANGUAGE) || getLocale());
}

export function currentCurrency(): SupportedCurrency {
  return (UrlUtil.getURLParameter(QUERY_KEY.CURRENCY).toUpperCase() as SupportedCurrency) || DEFAULT_CURRENCY;
}

export function normalizeLanguage(language: string = DEFAULT_LANGUAGE): string {
  const LANGUAGE_SHORTHAND_LENGTH = 2;
  return language.substring(0, LANGUAGE_SHORTHAND_LENGTH);
}

export function findLanguage(language: string = DEFAULT_LANGUAGE): string {
  language = normalizeLanguage(language);
  return Locales.find(locale => locale.startsWith(language));
}

export function mapLanguage(language: string = DEFAULT_LANGUAGE): string {
  return findLanguage(language) || DEFAULT_LANGUAGE;
}
