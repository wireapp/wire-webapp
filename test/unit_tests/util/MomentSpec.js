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

// grunt test_run:util/Moment

'use strict';

describe('z.util.moment', () => {
  describe('isToday', () => {
    it('should return true if date is today', () => {
      expect(moment().isToday()).toBeTruthy();
    });

    it('should return false if date is not today', () => {
      expect(moment('2011-10-05T14:48:00.000').isToday()).toBeFalsy();
    });
  });

  describe('isCurrentYear', () => {
    it('should return true if date is current year', () => {
      expect(moment().isCurrentYear()).toBeTruthy();
    });

    it('should return false if date is current year', () => {
      expect(moment('2011-10-05T14:48:00.000').isCurrentYear()).toBeFalsy();
    });
  });

  describe('isSameDay', () => {
    it('should return true if two dates are from the same day', () => {
      expect(moment('2011-10-05T14:48:00.000').isSameDay('2011-10-05T12:48:00.000')).toBeTruthy();
    });

    it('should return false if two dates are not from the same day', () => {
      expect(moment('2011-10-05T14:48:00.000').isSameDay('2011-10-04T12:48:00.000')).toBeFalsy();
    });
  });

  describe('isSameMonth', () => {
    it('should return true if two dates are from the same month', () => {
      expect(moment('2011-10-06T14:48:00.000').isSameMonth('2011-10-05T12:48:00.000')).toBeTruthy();
    });

    it('should return false if two dates are not from the same day', () => {
      expect(moment('2011-11-05T14:48:00.000').isSameMonth('2011-10-05T12:48:00.000')).toBeFalsy();
    });
  });
});
