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

import {formatDateNumeral, formatDayMonthNumeral, formatLocale, setDateLocale, setRegionalDateLocale} from './timeUtil';

const fixedLocalCalendarDate = new Date(2026, 6, 27, 12, 0, 0, 0);

describe('regional numeric date formatting', (): void => {
  beforeEach((): void => {
    setDateLocale('en');
    setRegionalDateLocale('en-US');
  });

  afterEach((): void => {
    setDateLocale('en');
    setRegionalDateLocale('en-US');
  });

  it.each([
    {regionalLocale: 'en-US', expectedDate: '07/27/2026', expectedDayMonth: '07/27'},
    {regionalLocale: 'en-GB', expectedDate: '27/07/2026', expectedDayMonth: '27/07'},
    {regionalLocale: 'de-DE', expectedDate: '27.07.2026', expectedDayMonth: '27.07.'},
  ])('uses the date order for $regionalLocale', ({regionalLocale, expectedDate, expectedDayMonth}): void => {
    setRegionalDateLocale(regionalLocale);

    const actualDate = formatDateNumeral(fixedLocalCalendarDate);
    const actualDayMonth = formatDayMonthNumeral(fixedLocalCalendarDate);

    expect(actualDate).toBe(expectedDate);
    expect(actualDayMonth).toBe(expectedDayMonth);
  });

  it('keeps date-fns language formatting separate from regional numeric formatting', (): void => {
    setDateLocale('de');
    setRegionalDateLocale('en-GB');

    const actualMonthName = formatLocale(fixedLocalCalendarDate, 'MMMM');
    const actualDate = formatDateNumeral(fixedLocalCalendarDate);

    expect(actualMonthName).toBe('Juli');
    expect(actualDate).toBe('27/07/2026');
  });
});
