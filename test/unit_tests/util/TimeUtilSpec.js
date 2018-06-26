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

// grunt test_init && grunt test_run:util/TimeUtil

'use strict';

describe('z.util.TimeUtil', () => {
  const ONE_SECOND_IN_MILLIS = 1000;
  const ONE_MINUTE_IN_MILLIS = 1000 * 60;
  const ONE_HOUR_IN_MILLIS = 1000 * 60 * 60;
  const ONE_DAY_IN_MILLIS = 1000 * 60 * 60 * 24;
  const ONE_WEEK_IN_MILLIS = 1000 * 60 * 60 * 24 * 7;
  const ONE_YEAR_IN_MILLIS = 1000 * 60 * 60 * 24 * 365;

  describe('"formatDuration"', () => {
    it('formats durations in seconds', () => {
      expect(z.util.TimeUtil.formatDuration(ONE_SECOND_IN_MILLIS)).toEqual({text: '1 second', unit: 's', value: 1});
      expect(z.util.TimeUtil.formatDuration(ONE_SECOND_IN_MILLIS + 300)).toEqual({
        text: '1 second',
        unit: 's',
        value: 1,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_SECOND_IN_MILLIS * 2)).toEqual({
        text: '2 seconds',
        unit: 's',
        value: 2,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_SECOND_IN_MILLIS * 2 + 300)).toEqual({
        text: '2 seconds',
        unit: 's',
        value: 2,
      });
      expect(z.util.TimeUtil.formatDuration(5000)).toEqual({text: '5 seconds', unit: 's', value: 5});
      expect(z.util.TimeUtil.formatDuration(15000)).toEqual({text: '15 seconds', unit: 's', value: 15});
    });

    it('formats durations in minutes', () => {
      expect(z.util.TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS)).toEqual({text: '1 minute', unit: 'm', value: 1});
      expect(z.util.TimeUtil.formatDuration(ONE_SECOND_IN_MILLIS * 60)).toEqual({
        text: '1 minute',
        unit: 'm',
        value: 1,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS * 5)).toEqual({
        text: '5 minutes',
        unit: 'm',
        value: 5,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        text: '1 minute',
        unit: 'm',
        value: 1,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS + 29 * ONE_SECOND_IN_MILLIS)).toEqual({
        text: '1 minute',
        unit: 'm',
        value: 1,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS + 30 * ONE_SECOND_IN_MILLIS)).toEqual({
        text: '2 minutes',
        unit: 'm',
        value: 2,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS * 2 + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        text: '2 minutes',
        unit: 'm',
        value: 2,
      });
      expect(z.util.TimeUtil.formatDuration(60000)).toEqual({text: '1 minute', unit: 'm', value: 1});
      expect(z.util.TimeUtil.formatDuration(900000)).toEqual({text: '15 minutes', unit: 'm', value: 15});
    });

    it('formats durations in hours', () => {
      expect(z.util.TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS)).toEqual({text: '1 hour', unit: 'h', value: 1});
      expect(z.util.TimeUtil.formatDuration(ONE_MINUTE_IN_MILLIS * 60)).toEqual({text: '1 hour', unit: 'h', value: 1});
      expect(z.util.TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        text: '1 hour',
        unit: 'h',
        value: 1,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS + 3 * ONE_MINUTE_IN_MILLIS)).toEqual({
        text: '1 hour',
        unit: 'h',
        value: 1,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS + 29 * ONE_MINUTE_IN_MILLIS)).toEqual({
        text: '1 hour',
        unit: 'h',
        value: 1,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS + 30 * ONE_MINUTE_IN_MILLIS)).toEqual({
        text: '2 hours',
        unit: 'h',
        value: 2,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS * 2 + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        text: '2 hours',
        unit: 'h',
        value: 2,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS * 2 + 3 * ONE_MINUTE_IN_MILLIS)).toEqual({
        text: '2 hours',
        unit: 'h',
        value: 2,
      });
    });

    it('formats durations in days', () => {
      expect(z.util.TimeUtil.formatDuration(ONE_DAY_IN_MILLIS)).toEqual({text: '1 day', unit: 'd', value: 1});
      expect(z.util.TimeUtil.formatDuration(ONE_HOUR_IN_MILLIS * 24)).toEqual({text: '1 day', unit: 'd', value: 1});
      expect(z.util.TimeUtil.formatDuration(ONE_DAY_IN_MILLIS + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        text: '1 day',
        unit: 'd',
        value: 1,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_DAY_IN_MILLIS + 3 * ONE_MINUTE_IN_MILLIS)).toEqual({
        text: '1 day',
        unit: 'd',
        value: 1,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_DAY_IN_MILLIS + 3 * ONE_HOUR_IN_MILLIS)).toEqual({
        text: '1 day',
        unit: 'd',
        value: 1,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_DAY_IN_MILLIS + 11 * ONE_HOUR_IN_MILLIS)).toEqual({
        text: '1 day',
        unit: 'd',
        value: 1,
      });
      expect(z.util.TimeUtil.formatDuration(ONE_DAY_IN_MILLIS + 12 * ONE_HOUR_IN_MILLIS)).toEqual({
        text: '2 days',
        unit: 'd',
        value: 2,
      });
      expect(z.util.TimeUtil.formatDuration(2 * ONE_DAY_IN_MILLIS + 3 * ONE_SECOND_IN_MILLIS)).toEqual({
        text: '2 days',
        unit: 'd',
        value: 2,
      });
      expect(z.util.TimeUtil.formatDuration(2 * ONE_DAY_IN_MILLIS + 3 * ONE_MINUTE_IN_MILLIS)).toEqual({
        text: '2 days',
        unit: 'd',
        value: 2,
      });
      expect(z.util.TimeUtil.formatDuration(2 * ONE_DAY_IN_MILLIS + 3 * ONE_HOUR_IN_MILLIS)).toEqual({
        text: '2 days',
        unit: 'd',
        value: 2,
      });
    });

    it('formats durations in weeks', () => {
      expect(z.util.TimeUtil.formatDuration(ONE_WEEK_IN_MILLIS)).toEqual({text: '1 week', unit: 'w', value: 1});
    });

    it('formats durations in years', () => {
      expect(z.util.TimeUtil.formatDuration(ONE_YEAR_IN_MILLIS)).toEqual({text: '1 year', unit: 'y', value: 1});
      expect(z.util.TimeUtil.formatDuration(2 * ONE_YEAR_IN_MILLIS)).toEqual({text: '2 years', unit: 'y', value: 2});
    });
  });

  describe('"formatSeconds"', () => {
    it('formats seconds', () => {
      expect(z.util.TimeUtil.formatSeconds(50)).toBe('00:50');
    });

    it('formats minutes and seconds', () => {
      expect(z.util.TimeUtil.formatSeconds(110)).toBe('01:50');
    });

    it('formats hours, minutes and seconds', () => {
      expect(z.util.TimeUtil.formatSeconds(3630)).toBe('1:00:30');
    });

    it('formats 0 seconds', () => {
      expect(z.util.TimeUtil.formatSeconds(0)).toBe('00:00');
    });

    it('formats undefined as 00:00', () => {
      expect(z.util.TimeUtil.formatSeconds()).toBe('00:00');
    });
  });
});
