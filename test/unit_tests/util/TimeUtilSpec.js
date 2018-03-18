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
  describe('formatMilliseconds', () => {
    it('should format duration under 1 minute', () => {
      expect(z.util.TimeUtil.formatMilliseconds(5000)).toEqual({unit: 's', value: 5});
      expect(z.util.TimeUtil.formatMilliseconds(15000)).toEqual({unit: 's', value: 15});
    });

    it('should format duration over 1 minute', () => {
      expect(z.util.TimeUtil.formatMilliseconds(60000)).toEqual({unit: 'm', value: 1});
      expect(z.util.TimeUtil.formatMilliseconds(900000)).toEqual({unit: 'm', value: 15});
    });

    it('should format duration over 1 hour', () => {
      expect(z.util.TimeUtil.formatMilliseconds(1000 * 60 * 60 * 3)).toEqual({unit: 'h', value: 3});
    });

    it('should format duration over 1 day', () => {
      expect(z.util.TimeUtil.formatMilliseconds(1000 * 60 * 60 * 24 * 3)).toEqual({unit: 'd', value: 3});
    });
  });
});
