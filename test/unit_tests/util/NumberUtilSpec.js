/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

// grunt test_init && grunt test_run:util/NumberUtil

'use strict';

describe('z.util.NumberUtil', function() {
  describe('in_range', function() {
    it('returns true for values inside the specified range', function() {
      expect(z.util.NumberUtil.in_range(0, 0, 2)).toBeTruthy();
      expect(z.util.NumberUtil.in_range(1, 0, 2)).toBeTruthy();
      expect(z.util.NumberUtil.in_range(1, 0, 2)).toBeTruthy();
    });

    it('returns false for values outside the specified range', function() {
      expect(z.util.NumberUtil.in_range(undefined, 0, 2)).toBeFalsy();
      expect(z.util.NumberUtil.in_range(-1, 0, 2)).toBeFalsy();
      expect(z.util.NumberUtil.in_range(3, 0, 2)).toBeFalsy();
    });
  });
});
