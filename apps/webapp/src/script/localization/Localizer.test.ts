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

import {resolveApplicationLocale} from './Localizer';

describe('resolveApplicationLocale', (): void => {
  it.each([
    {
      browserLocale: 'en-US',
      desktopRegionalLocale: 'de-DE',
      expectedApplicationLanguage: 'en',
      expectedRegionalDateLocale: 'de-DE',
      queryParameter: undefined,
    },
    {
      browserLocale: 'en-GB',
      desktopRegionalLocale: undefined,
      expectedApplicationLanguage: 'en',
      expectedRegionalDateLocale: 'en-GB',
      queryParameter: undefined,
    },
    {
      browserLocale: 'de-DE',
      desktopRegionalLocale: undefined,
      expectedApplicationLanguage: 'de',
      expectedRegionalDateLocale: 'de-DE',
      queryParameter: undefined,
    },
    {
      browserLocale: 'en-US',
      desktopRegionalLocale: 'en-GB',
      expectedApplicationLanguage: 'de',
      expectedRegionalDateLocale: 'en-GB',
      queryParameter: 'de',
    },
    {
      browserLocale: 'en-GB',
      desktopRegionalLocale: '',
      expectedApplicationLanguage: 'en',
      expectedRegionalDateLocale: 'en-GB',
      queryParameter: undefined,
    },
  ])(
    'resolves application and regional locales independently for $browserLocale',
    ({
      browserLocale,
      desktopRegionalLocale,
      expectedApplicationLanguage,
      expectedRegionalDateLocale,
      queryParameter,
    }): void => {
      const actualLocaleSettings = resolveApplicationLocale({
        queryParameter,
        storedLocale: undefined,
        browserLocale,
        desktopRegionalLocale,
      });

      expect(actualLocaleSettings.applicationTranslationLanguage).toBe(expectedApplicationLanguage);
      expect(actualLocaleSettings.regionalDateLocale).toBe(expectedRegionalDateLocale);
    },
  );
});
