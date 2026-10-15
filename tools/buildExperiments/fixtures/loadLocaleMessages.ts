/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import germanLocaleMessages from './locales/de.json';
import englishLocaleMessages from './locales/en.json';

type LocaleMessages = Readonly<Record<string, string>>;

const localeMessagesByLanguageCode: Partial<Record<string, LocaleMessages>> = {
  de: germanLocaleMessages,
  en: englishLocaleMessages,
};

export function loadLocaleMessages(languageCode: string): LocaleMessages {
  const selectedLocaleMessages = localeMessagesByLanguageCode[languageCode];

  if (selectedLocaleMessages === undefined) {
    return englishLocaleMessages;
  }

  // eslint-disable-next-line import/no-dynamic-require -- The fixture intentionally exercises a computed require.
  return require(`./locales/${languageCode}.json`) as LocaleMessages;
}
