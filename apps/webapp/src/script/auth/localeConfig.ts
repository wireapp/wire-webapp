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

import {UrlUtil} from '@wireapp/commons';

import {QUERY_KEY} from './route';
import {Locales, SupportedLocale} from './supportedLocales';

const DEFAULT_LANGUAGE: SupportedLocale = 'en-US';

function getLocale(): SupportedLocale {
  return mapLanguage(
    navigator.languages !== undefined && navigator.languages.length !== 0 && !Number.isNaN(navigator.languages.length)
      ? navigator.languages[0]
      : navigator.language,
  );
}

export function currentLanguage(): SupportedLocale {
  const languageParameter = UrlUtil.getURLParameter(QUERY_KEY.LANGUAGE);
  return mapLanguage(languageParameter.length > 0 ? languageParameter : getLocale());
}

export function normalizeLanguage(language: string = DEFAULT_LANGUAGE): string {
  const LANGUAGE_SHORTHAND_LENGTH = 2;
  return language.substring(0, LANGUAGE_SHORTHAND_LENGTH);
}

export function findLanguage(language: string = DEFAULT_LANGUAGE): SupportedLocale {
  language = normalizeLanguage(language);
  return Locales.find(locale => locale.startsWith(language)) ?? DEFAULT_LANGUAGE;
}

export function mapLanguage(language: string = DEFAULT_LANGUAGE): SupportedLocale {
  return findLanguage(language);
}
