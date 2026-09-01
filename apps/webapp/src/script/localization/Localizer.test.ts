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
    {browserRegionalLocale: 'en-GB', expectedApplicationLanguage: 'en', expectedRegionalDateLocale: 'en-GB'},
    {browserRegionalLocale: 'en-US', expectedApplicationLanguage: 'en', expectedRegionalDateLocale: 'en-US'},
    {browserRegionalLocale: 'de-DE', expectedApplicationLanguage: 'de', expectedRegionalDateLocale: 'de-DE'},
  ])(
    'keeps the application language and regional locale separate for $browserRegionalLocale',
    ({browserRegionalLocale, expectedApplicationLanguage, expectedRegionalDateLocale}): void => {
      const actualLocaleSettings = resolveApplicationLocale({
        queryParameter: undefined,
        storedLocale: undefined,
        browserRegionalLocale,
      });

      expect(actualLocaleSettings.applicationTranslationLanguage).toBe(expectedApplicationLanguage);
      expect(actualLocaleSettings.regionalDateLocale).toBe(expectedRegionalDateLocale);
    },
  );
});
