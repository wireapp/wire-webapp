/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:util/Moment

'use strict';

describe('z.util.moment', () => {
  describe('is_today', () => {
    it('should return true if date is today', () => {
      expect(moment().is_today()).toBeTruthy();
    });

    it('should return false if date is not today', () => {
      expect(moment('2011-10-05T14:48:00.000').is_today()).toBeFalsy();
    });
  });

  describe('is_current_year', () => {
    it('should return true if date is current year', () => {
      expect(moment().is_current_year()).toBeTruthy();
    });

    it('should return false if date is current year', () => {
      expect(moment('2011-10-05T14:48:00.000').is_current_year()).toBeFalsy();
    });
  });

  describe('is_same_day', () => {
    it('should return true if two dates are from the same day', () => {
      expect(
        moment('2011-10-05T14:48:00.000').is_same_day('2011-10-05T12:48:00.000')
      ).toBeTruthy();
    });

    it('should return false if two dates are not from the same day', () => {
      expect(
        moment('2011-10-05T14:48:00.000').is_same_day('2011-10-04T12:48:00.000')
      ).toBeFalsy();
    });
  });

  describe('is_same_month', () => {
    it('should return true if two dates are from the same month', () => {
      expect(
        moment('2011-10-06T14:48:00.000').is_same_month(
          '2011-10-05T12:48:00.000'
        )
      ).toBeTruthy();
    });

    it('should return false if two dates are not from the same day', () => {
      expect(
        moment('2011-11-05T14:48:00.000').is_same_month(
          '2011-10-05T12:48:00.000'
        )
      ).toBeFalsy();
    });
  });
});
