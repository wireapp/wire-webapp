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

import {translate} from 'Util/localizerUtil';
import {
  formatDayMonth,
  formatDayMonthNumeral,
  formatDuration,
  formatDurationCaption,
  formatSeconds,
  formatCoarseDuration,
  isSameDay,
  isSameMonth,
  isThisYear,
  isToday,
  setDateLocale,
  weeksPassedSinceDate,
} from 'Util/TimeUtil';

describe('TimeUtil', () => {
  const ONE_SECOND_IN_MILLIS = 1000;
  const ONE_MINUTE_IN_MILLIS = 1000 * 60;
  const ONE_HOUR_IN_MILLIS = 1000 * 60 * 60;
  const ONE_DAY_IN_MILLIS = 1000 * 60 * 60 * 24;
  const ONE_WEEK_IN_MILLIS = 1000 * 60 * 60 * 24 * 7;
  const ONE_YEAR_IN_MILLIS = 1000 * 60 * 60 * 24 * 365;

  describe('"formatDuration"', () => {
    it('formats durations in seconds', () => {
      expect(formatDuration(ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 's',
        text: `1 ${translate('ephemeralUnitsSecond')}`,
        value: 1,
      });

      expect(formatDuration(ONE_SECOND_IN_MILLIS + 300)).toEqual({
        symbol: 's',
        text: `1 ${translate('ephemeralUnitsSecond')}`,
        value: 1,
      });

      expect(formatDuration(ONE_SECOND_IN_MILLIS * 2)).toEqual({
        symbol: 's',
        text: `2 ${translate('ephemeralUnitsSeconds')}`,
        value: 2,
      });

      expect(formatDuration(ONE_SECOND_IN_MILLIS * 2 + 300)).toEqual({
        symbol: 's',
        text: `2 ${translate('ephemeralUnitsSeconds')}`,
        value: 2,
      });

      expect(formatDuration(5000)).toEqual({
        symbol: 's',
        text: `5 ${translate('ephemeralUnitsSeconds')}`,
        value: 5,
      });

      expect(formatDuration(15000)).toEqual({
        symbol: 's',
        text: `15 ${translate('ephemeralUnitsSeconds')}`,
        value: 15,
      });

      expect(formatDuration(800)).toEqual({
        symbol: 's',
        text: `0 ${translate('ephemeralUnitsSeconds')}`,
        value: 0,
      });
    });

    it('formats durations in minutes', () => {
      expect(formatDuration(ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'm',
        text: `1 ${translate('ephemeralUnitsMinute')}`,
        value: 1,
      });

      expect(formatDuration(ONE_SECOND_IN_MILLIS * 60)).toEqual({
        symbol: 'm',
        text: `1 ${translate('ephemeralUnitsMinute')}`,
        value: 1,
      });

      expect(formatDuration(ONE_MINUTE_IN_MILLIS * 5)).toEqual({
        symbol: 'm',
        text: `5 ${translate('ephemeralUnitsMinutes')}`,
        value: 5,
      });

      expect(formatDuration(ONE_MINUTE_IN_MILLIS + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'm',
        text: `1 ${translate('ephemeralUnitsMinute')}`,
        value: 1,
      });

      expect(formatDuration(ONE_MINUTE_IN_MILLIS + 29 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'm',
        text: `1 ${translate('ephemeralUnitsMinute')}`,
        value: 1,
      });

      expect(formatDuration(ONE_MINUTE_IN_MILLIS + 30 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'm',
        text: `2 ${translate('ephemeralUnitsMinutes')}`,
        value: 2,
      });

      expect(formatDuration(ONE_MINUTE_IN_MILLIS * 2 + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'm',
        text: `2 ${translate('ephemeralUnitsMinutes')}`,
        value: 2,
      });

      expect(formatDuration(60000)).toEqual({
        symbol: 'm',
        text: `1 ${translate('ephemeralUnitsMinute')}`,
        value: 1,
      });

      expect(formatDuration(900000)).toEqual({
        symbol: 'm',
        text: `15 ${translate('ephemeralUnitsMinutes')}`,
        value: 15,
      });
    });

    it('formats durations in hours', () => {
      expect(formatDuration(ONE_HOUR_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `1 ${translate('ephemeralUnitsHour')}`,
        value: 1,
      });

      expect(formatDuration(ONE_MINUTE_IN_MILLIS * 60)).toEqual({
        symbol: 'h',
        text: `1 ${translate('ephemeralUnitsHour')}`,
        value: 1,
      });

      expect(formatDuration(ONE_HOUR_IN_MILLIS + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `1 ${translate('ephemeralUnitsHour')}`,
        value: 1,
      });

      expect(formatDuration(ONE_HOUR_IN_MILLIS + 3 * ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `1 ${translate('ephemeralUnitsHour')}`,
        value: 1,
      });

      expect(formatDuration(ONE_HOUR_IN_MILLIS + 29 * ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `1 ${translate('ephemeralUnitsHour')}`,
        value: 1,
      });

      expect(formatDuration(ONE_HOUR_IN_MILLIS + 30 * ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `2 ${translate('ephemeralUnitsHours')}`,
        value: 2,
      });

      expect(formatDuration(ONE_HOUR_IN_MILLIS * 2 + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `2 ${translate('ephemeralUnitsHours')}`,
        value: 2,
      });

      expect(formatDuration(ONE_HOUR_IN_MILLIS * 2 + 3 * ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `2 ${translate('ephemeralUnitsHours')}`,
        value: 2,
      });
    });

    it('formats durations in days', () => {
      expect(formatDuration(ONE_DAY_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `1 ${translate('ephemeralUnitsDay')}`,
        value: 1,
      });

      expect(formatDuration(ONE_HOUR_IN_MILLIS * 24)).toEqual({
        symbol: 'd',
        text: `1 ${translate('ephemeralUnitsDay')}`,
        value: 1,
      });

      expect(formatDuration(ONE_DAY_IN_MILLIS + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `1 ${translate('ephemeralUnitsDay')}`,
        value: 1,
      });

      expect(formatDuration(ONE_DAY_IN_MILLIS + 3 * ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `1 ${translate('ephemeralUnitsDay')}`,
        value: 1,
      });

      expect(formatDuration(ONE_DAY_IN_MILLIS + 3 * ONE_HOUR_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `1 ${translate('ephemeralUnitsDay')}`,
        value: 1,
      });

      expect(formatDuration(ONE_DAY_IN_MILLIS + 11 * ONE_HOUR_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `1 ${translate('ephemeralUnitsDay')}`,
        value: 1,
      });

      expect(formatDuration(ONE_DAY_IN_MILLIS + 12 * ONE_HOUR_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `2 ${translate('ephemeralUnitsDays')}`,
        value: 2,
      });

      expect(formatDuration(2 * ONE_DAY_IN_MILLIS + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `2 ${translate('ephemeralUnitsDays')}`,
        value: 2,
      });

      expect(formatDuration(2 * ONE_DAY_IN_MILLIS + 3 * ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `2 ${translate('ephemeralUnitsDays')}`,
        value: 2,
      });

      expect(formatDuration(2 * ONE_DAY_IN_MILLIS + 3 * ONE_HOUR_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `2 ${translate('ephemeralUnitsDays')}`,
        value: 2,
      });
    });

    it('formats durations in weeks', () => {
      expect(formatDuration(ONE_WEEK_IN_MILLIS)).toEqual({
        symbol: 'w',
        text: `1 ${translate('ephemeralUnitsWeek')}`,
        value: 1,
      });

      expect(formatDuration(ONE_WEEK_IN_MILLIS * 26)).toEqual({
        symbol: 'w',
        text: `26 ${translate('ephemeralUnitsWeeks')}`,
        value: 26,
      });

      expect(formatDuration(ONE_WEEK_IN_MILLIS * 27)).toEqual({
        symbol: 'w',
        text: `27 ${translate('ephemeralUnitsWeeks')}`,
        value: 27,
      });
    });

    it('formats durations in years', () => {
      expect(formatDuration(ONE_YEAR_IN_MILLIS)).toEqual({
        symbol: 'y',
        text: `1 ${translate('ephemeralUnitsYear')}`,
        value: 1,
      });

      expect(formatDuration(2 * ONE_YEAR_IN_MILLIS)).toEqual({
        symbol: 'y',
        text: `2 ${translate('ephemeralUnitsYears')}`,
        value: 2,
      });
    });

    it('uses an injected translate function', () => {
      const translate = translationKey => `translated:${translationKey}`;

      expect(formatDuration(ONE_SECOND_IN_MILLIS, translate)).toEqual({
        symbol: 's',
        text: '1 translated:ephemeralUnitsSecond',
        value: 1,
      });
    });
  });

  describe('"formatDurationCaption"', () => {
    let caption;

    it('renders hours and minutes correctly', () => {
      caption = formatDurationCaption(ONE_HOUR_IN_MILLIS + ONE_MINUTE_IN_MILLIS);

      expect(caption).toEqual('01:01');
    });

    it('renders days and hours:minutes', () => {
      caption = formatDurationCaption(ONE_DAY_IN_MILLIS + ONE_HOUR_IN_MILLIS + ONE_MINUTE_IN_MILLIS);

      expect(caption).toEqual(`1 ${translate('ephemeralUnitsDay')} and 01:01`);
    });

    it('renders just the days if hours are 0', () => {
      caption = formatDurationCaption(2 * ONE_DAY_IN_MILLIS + ONE_MINUTE_IN_MILLIS);

      expect(caption).toEqual(`2 ${translate('ephemeralUnitsDays')}`);
    });

    it('renders weeks and days', () => {
      caption = formatDurationCaption(3 * ONE_WEEK_IN_MILLIS + ONE_DAY_IN_MILLIS);

      expect(caption).toEqual(`3 ${translate('ephemeralUnitsWeeks')} and 1 ${translate('ephemeralUnitsDay')}`);
    });

    it('uses an injected translate function', () => {
      caption = formatDurationCaption(3 * ONE_WEEK_IN_MILLIS + ONE_DAY_IN_MILLIS, translationKey => {
        return `translated:${translationKey}`;
      });

      expect(caption).toEqual('3 translated:ephemeralUnitsWeeks translated:and 1 translated:ephemeralUnitsDay');
    });
  });

  describe('"formatCoarseDuration"', () => {
    it('formats durations in days (singular & plural)', () => {
      expect(formatCoarseDuration(ONE_DAY_IN_MILLIS)).toBe(translate('initProgressDaysSingular', {time: 1}));

      // Floor should keep it at 1 day
      expect(formatCoarseDuration(ONE_DAY_IN_MILLIS + 11 * ONE_HOUR_IN_MILLIS)).toBe(
        translate('initProgressDaysSingular', {time: 1}),
      );

      expect(formatCoarseDuration(2 * ONE_DAY_IN_MILLIS)).toBe(translate('initProgressDaysPlural', {time: 2}));
      expect(formatCoarseDuration(2 * ONE_DAY_IN_MILLIS + 5 * ONE_HOUR_IN_MILLIS)).toBe(
        translate('initProgressDaysPlural', {time: 2}),
      );
    });

    it('formats durations in hours (singular & plural)', () => {
      expect(formatCoarseDuration(ONE_HOUR_IN_MILLIS)).toBe(translate('initProgressHoursSingular', {time: 1}));

      // Floor keeps it at 1 hour
      expect(formatCoarseDuration(ONE_HOUR_IN_MILLIS + 59 * ONE_MINUTE_IN_MILLIS)).toBe(
        translate('initProgressHoursSingular', {time: 1}),
      );

      expect(formatCoarseDuration(2 * ONE_HOUR_IN_MILLIS)).toBe(translate('initProgressHoursPlural', {time: 2}));
      expect(formatCoarseDuration(2 * ONE_HOUR_IN_MILLIS + 30 * ONE_MINUTE_IN_MILLIS)).toBe(
        translate('initProgressHoursPlural', {time: 2}),
      );
    });

    it('formats durations in minutes (singular & plural)', () => {
      expect(formatCoarseDuration(ONE_MINUTE_IN_MILLIS)).toBe(translate('initProgressMinutesSingular', {time: 1}));

      // Floor keeps it at 1 minute
      expect(formatCoarseDuration(ONE_MINUTE_IN_MILLIS + 59 * ONE_SECOND_IN_MILLIS)).toBe(
        translate('initProgressMinutesSingular', {time: 1}),
      );

      expect(formatCoarseDuration(2 * ONE_MINUTE_IN_MILLIS)).toBe(translate('initProgressMinutesPlural', {time: 2}));

      // Sub-minute durations should be treated as 1 minute (singular)
      expect(formatCoarseDuration(59 * ONE_SECOND_IN_MILLIS)).toBe(translate('initProgressMinutesSingular', {time: 1}));

      // Explicit 30s case
      expect(formatCoarseDuration(30 * ONE_SECOND_IN_MILLIS)).toBe(translate('initProgressMinutesSingular', {time: 1}));
    });

    it('uses an injected translate function', () => {
      expect(formatCoarseDuration(ONE_DAY_IN_MILLIS, translationKey => `translated:${translationKey}`)).toBe(
        'translated:initProgressDaysSingular',
      );
    });
  });

  describe('"formatSeconds"', () => {
    it('formats seconds', () => {
      expect(formatSeconds(50)).toBe('00:50');
    });

    it('formats minutes and seconds', () => {
      expect(formatSeconds(110)).toBe('01:50');
    });

    it('formats hours, minutes and seconds', () => {
      expect(formatSeconds(3630)).toBe('1:00:30');
    });

    it('formats 0 seconds', () => {
      expect(formatSeconds(0)).toBe('00:00');
    });

    it('formats undefined as 00:00', () => {
      expect(formatSeconds()).toBe('00:00');
    });
  });

  describe('isToday', () => {
    it('should return true if date is today', () => {
      expect(isToday(new Date())).toBeTruthy();
    });

    it('should return false if date is not today', () => {
      expect(isToday(new Date('2011-10-05T14:48:00.000'))).toBeFalsy();
    });
  });

  describe('isThisYear', () => {
    it('should return true if date is current year', () => {
      expect(isThisYear(Date.now())).toBeTruthy();
    });

    it('should return false if date is current year', () => {
      expect(isThisYear(new Date('2011-10-05T14:48:00.000'))).toBeFalsy();
    });
  });

  describe('isSameDay', () => {
    it('should return true if two dates are from the same day', () => {
      expect(isSameDay(new Date('2011-10-05T14:48:00.000'), new Date('2011-10-05T12:48:00.000'))).toBeTruthy();
    });

    it('should return false if two dates are not from the same day', () => {
      expect(isSameDay(new Date('2011-10-05T14:48:00.000'), new Date('2011-10-04T12:48:00.000'))).toBeFalsy();
    });
  });

  describe('isSameMonth', () => {
    it('should return true if two dates are from the same month', () => {
      expect(isSameMonth(new Date('2011-10-06T14:48:00.000'), new Date('2011-10-05T12:48:00.000'))).toBeTruthy();
    });

    it('should return false if two dates are not from the same month', () => {
      expect(isSameMonth(new Date('2011-11-05T14:48:00.000'), new Date('2011-10-05T12:48:00.000'))).toBeFalsy();
    });
  });

  describe('formatDayMonth', () => {
    it('shows the correctly formatted day and month for the date in default language', () => {
      expect(formatDayMonth(new Date('2011-11-05T14:48:00.000'))).toBe('Nov 5');
    });

    it('shows the correctly formatted day and month for the date in german', () => {
      setDateLocale('de');

      expect(formatDayMonth(new Date('2011-11-05T14:48:00.000'))).toBe('5. Nov.');
      setDateLocale('en');
    });
  });

  describe('formatDayMonthNumeral', () => {
    it('shows the correctly formatted day and month numerals for the date in default language', () => {
      expect(formatDayMonthNumeral(new Date('2011-11-05T14:48:00.000'))).toBe('11/05');
    });

    it('shows the correctly formatted day and month numerals for the date in german', () => {
      setDateLocale('de');

      expect(formatDayMonthNumeral(new Date('2011-11-05T14:48:00.000'))).toBe('05.11.');
      setDateLocale('en');
    });
  });

  const currentDate = new Date('2023-06-13T12:10:00Z');
  describe(`weeksPassedSinceDate with current date ${currentDate}`, () => {
    const cases = [
      ['some date in the future', new Date('2023-06-14T12:10:00Z'), 1],
      ['current date', currentDate, 1],
      ['3 days ago', new Date('2023-06-10T12:10:00Z'), 1],
      ['1 week ago', new Date('2023-06-06T12:10:00Z'), 1],
      ['8 days ago', new Date('2023-06-05T12:10:00Z'), 2],
      ['20 days ago', new Date('2023-05-24T12:10:00Z'), 3],
      ['24 days ago', new Date('2023-05-20T12:10:00Z'), 4],
      ['28 days ago', new Date('2023-05-16T12:10:00Z'), 4],
      ['30 days ago', new Date('2023-05-14T12:10:00Z'), 5],
    ];

    beforeAll(() => {
      jest.useFakeTimers();
    });

    afterAll(() => {
      jest.useRealTimers();
    });
    it.each(cases)('for %s (%s) should return %s week(s)', (_, date, weeks) => {
      jest.setSystemTime(currentDate);
      expect(weeksPassedSinceDate(date)).toBe(weeks);
    });
  });
});
