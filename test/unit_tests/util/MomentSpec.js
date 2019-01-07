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

import moment from 'moment';
/* eslint-disable no-unused-vars */
import {isSameDay, isSameMonth, isCurrentYear, isToday} from '../../../src/script/util/moment';
/* eslint-enable no-unused-vars */

describe('z.util.moment', () => {
  describe('isToday', () => {
    it('should return true if date is today', () => {
      expect(isToday(moment())).toBeTruthy();
    });

    it('should return false if date is not today', () => {
      expect(isToday(moment('2011-10-05T14:48:00.000'))).toBeFalsy();
    });
  });

  describe('isCurrentYear', () => {
    it('should return true if date is current year', () => {
      expect(isCurrentYear(moment())).toBeTruthy();
    });

    it('should return false if date is current year', () => {
      expect(isCurrentYear(moment('2011-10-05T14:48:00.000'))).toBeFalsy();
    });
  });

  describe('isSameDay', () => {
    it('should return true if two dates are from the same day', () => {
      expect(isSameDay(moment('2011-10-05T14:48:00.000'), '2011-10-05T12:48:00.000')).toBeTruthy();
    });

    it('should return false if two dates are not from the same day', () => {
      expect(isSameDay(moment('2011-10-05T14:48:00.000'), '2011-10-04T12:48:00.000')).toBeFalsy();
    });
  });

  describe('isSameMonth', () => {
    it('should return true if two dates are from the same month', () => {
      expect(isSameMonth(moment('2011-10-06T14:48:00.000'), '2011-10-05T12:48:00.000')).toBeTruthy();
    });

    it('should return false if two dates are not from the same month', () => {
      expect(isSameMonth(moment('2011-11-05T14:48:00.000'), '2011-10-05T12:48:00.000')).toBeFalsy();
    });
  });
});
