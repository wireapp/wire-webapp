/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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

const {DateUtil} = require('@wireapp/commons');

/**
 * @testEnvironment node
 */
describe('DateUtil', () => {
  describe('isoFormat', () => {
    it('formats a valid date into the expected format', () => {
      // May 4th 2020, 13:42:00
      const date = new Date(1588599720000);
      const expectedDate = '2020-05-04';
      const expectedTime = '13:42:00';
      const actual = DateUtil.isoFormat(date);
      expect(actual.date).toEqual(expectedDate);
      expect(actual.time).toEqual(expectedTime);
    });
  });
});
