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

import {t} from 'utils/LocalizerUtil';
import {TimeUtil} from 'utils/TimeUtil';

describe('TimeUtil', () => {
  const ONE_SECOND_IN_MILLIS = 1000;
  const ONE_MINUTE_IN_MILLIS = 1000 * 60;
  const ONE_HOUR_IN_MILLIS = 1000 * 60 * 60;
  const ONE_DAY_IN_MILLIS = 1000 * 60 * 60 * 24;
  const ONE_WEEK_IN_MILLIS = 1000 * 60 * 60 * 24 * 7;
  const ONE_YEAR_IN_MILLIS = 1000 * 60 * 60 * 24 * 365;

  describe('"formatDuration"', () => {
    it('formats durations in seconds', () => {
      expect(TimeUtil.formatDuration(ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 's',
        text: `1 ${t('ephemeralUnitsSecond')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_SECOND_IN_MILLIS + 300)).toEqual({
        symbol: 's',
        text: `1 ${t('ephemeralUnitsSecond')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_SECOND_IN_MILLIS * 2)).toEqual({
        symbol: 's',
        text: `2 ${t('ephemeralUnitsSeconds')}`,
        value: 2,
      });

      expect(TimeUtil.formatDuration(ONE_SECOND_IN_MILLIS * 2 + 300)).toEqual({
        symbol: 's',
        text: `2 ${t('ephemeralUnitsSeconds')}`,
        value: 2,
      });

      expect(TimeUtil.formatDuration(5000)).toEqual({
        symbol: 's',
        text: `5 ${t('ephemeralUnitsSeconds')}`,
        value: 5,
      });

      expect(TimeUtil.formatDuration(15000)).toEqual({
        symbol: 's',
        text: `15 ${t('ephemeralUnitsSeconds')}`,
        value: 15,
      });
    });

    it('formats durations in minutes', () => {
      expect(TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'm',
        text: `1 ${t('ephemeralUnitsMinute')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_SECOND_IN_MILLIS * 60)).toEqual({
        symbol: 'm',
        text: `1 ${t('ephemeralUnitsMinute')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS * 5)).toEqual({
        symbol: 'm',
        text: `5 ${t('ephemeralUnitsMinutes')}`,
        value: 5,
      });

      expect(TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'm',
        text: `1 ${t('ephemeralUnitsMinute')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS + 29 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'm',
        text: `1 ${t('ephemeralUnitsMinute')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS + 30 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'm',
        text: `2 ${t('ephemeralUnitsMinutes')}`,
        value: 2,
      });

      expect(TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS * 2 + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'm',
        text: `2 ${t('ephemeralUnitsMinutes')}`,
        value: 2,
      });

      expect(TimeUtil.formatDuration(60000)).toEqual({
        symbol: 'm',
        text: `1 ${t('ephemeralUnitsMinute')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(900000)).toEqual({
        symbol: 'm',
        text: `15 ${t('ephemeralUnitsMinutes')}`,
        value: 15,
      });
    });

    it('formats durations in hours', () => {
      expect(TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `1 ${t('ephemeralUnitsHour')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS * 60)).toEqual({
        symbol: 'h',
        text: `1 ${t('ephemeralUnitsHour')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `1 ${t('ephemeralUnitsHour')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS + 3 * ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `1 ${t('ephemeralUnitsHour')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS + 29 * ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `1 ${t('ephemeralUnitsHour')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS + 30 * ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `2 ${t('ephemeralUnitsHours')}`,
        value: 2,
      });

      expect(TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS * 2 + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `2 ${t('ephemeralUnitsHours')}`,
        value: 2,
      });

      expect(TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS * 2 + 3 * ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'h',
        text: `2 ${t('ephemeralUnitsHours')}`,
        value: 2,
      });
    });

    it('formats durations in days', () => {
      expect(TimeUtil.formatDuration(ONE_DAY_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `1 ${t('ephemeralUnitsDay')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS * 24)).toEqual({
        symbol: 'd',
        text: `1 ${t('ephemeralUnitsDay')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_DAY_IN_MILLIS + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `1 ${t('ephemeralUnitsDay')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_DAY_IN_MILLIS + 3 * ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `1 ${t('ephemeralUnitsDay')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_DAY_IN_MILLIS + 3 * ONE_HOUR_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `1 ${t('ephemeralUnitsDay')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_DAY_IN_MILLIS + 11 * ONE_HOUR_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `1 ${t('ephemeralUnitsDay')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_DAY_IN_MILLIS + 12 * ONE_HOUR_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `2 ${t('ephemeralUnitsDays')}`,
        value: 2,
      });

      expect(TimeUtil.formatDuration(2 * ONE_DAY_IN_MILLIS + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `2 ${t('ephemeralUnitsDays')}`,
        value: 2,
      });

      expect(TimeUtil.formatDuration(2 * ONE_DAY_IN_MILLIS + 3 * ONE_MINUTE_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `2 ${t('ephemeralUnitsDays')}`,
        value: 2,
      });

      expect(TimeUtil.formatDuration(2 * ONE_DAY_IN_MILLIS + 3 * ONE_HOUR_IN_MILLIS)).toEqual({
        symbol: 'd',
        text: `2 ${t('ephemeralUnitsDays')}`,
        value: 2,
      });
    });

    it('formats durations in weeks', () => {
      expect(TimeUtil.formatDuration(ONE_WEEK_IN_MILLIS)).toEqual({
        symbol: 'w',
        text: `1 ${t('ephemeralUnitsWeek')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(ONE_WEEK_IN_MILLIS * 26)).toEqual({
        symbol: 'w',
        text: `26 ${t('ephemeralUnitsWeeks')}`,
        value: 26,
      });

      expect(TimeUtil.formatDuration(ONE_WEEK_IN_MILLIS * 27)).toEqual({
        symbol: 'w',
        text: `27 ${t('ephemeralUnitsWeeks')}`,
        value: 27,
      });
    });

    it('formats durations in years', () => {
      expect(TimeUtil.formatDuration(ONE_YEAR_IN_MILLIS)).toEqual({
        symbol: 'y',
        text: `1 ${t('ephemeralUnitsYear')}`,
        value: 1,
      });

      expect(TimeUtil.formatDuration(2 * ONE_YEAR_IN_MILLIS)).toEqual({
        symbol: 'y',
        text: `2 ${t('ephemeralUnitsYears')}`,
        value: 2,
      });
    });
  });

  describe('"formatDurationCaption"', () => {
    let caption;

    it('renders hours and minutes correctly', () => {
      caption = TimeUtil.formatDurationCaption(ONE_HOUR_IN_MILLIS + ONE_MINUTE_IN_MILLIS);

      expect(caption).toEqual(`01:01 ${t('ephemeralRemaining')}`);
    });

    it('renders days and hours:minutes', () => {
      caption = TimeUtil.formatDurationCaption(ONE_DAY_IN_MILLIS + ONE_HOUR_IN_MILLIS + ONE_MINUTE_IN_MILLIS);

      expect(caption).toEqual(`1 ${t('ephemeralUnitsDay')} and 01:01 ${t('ephemeralRemaining')}`);
    });

    it('renders just the days if hours are 0', () => {
      caption = TimeUtil.formatDurationCaption(2 * ONE_DAY_IN_MILLIS + ONE_MINUTE_IN_MILLIS);

      expect(caption).toEqual(`2 ${t('ephemeralUnitsDays')} ${t('ephemeralRemaining')}`);
    });

    it('renders weeks and days', () => {
      caption = TimeUtil.formatDurationCaption(3 * ONE_WEEK_IN_MILLIS + ONE_DAY_IN_MILLIS);

      expect(caption).toEqual(
        `3 ${t('ephemeralUnitsWeeks')} and 1 ${t('ephemeralUnitsDay')} ${t('ephemeralRemaining')}`
      );
    });
  });

  describe('"formatSeconds"', () => {
    it('formats seconds', () => {
      expect(TimeUtil.formatSeconds(50)).toBe('00:50');
    });

    it('formats minutes and seconds', () => {
      expect(TimeUtil.formatSeconds(110)).toBe('01:50');
    });

    it('formats hours, minutes and seconds', () => {
      expect(TimeUtil.formatSeconds(3630)).toBe('1:00:30');
    });

    it('formats 0 seconds', () => {
      expect(TimeUtil.formatSeconds(0)).toBe('00:00');
    });

    it('formats undefined as 00:00', () => {
      expect(TimeUtil.formatSeconds()).toBe('00:00');
    });
  });
});
