/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {getMapsUrl} from 'Util/LocationUtil';

describe('LocationUtil', () => {
  describe('getMapsUrl', () => {
    it('returns the proper URLs', () => {
      expect(getMapsUrl(52, 13)).toBe('https://google.com/maps/@52,13');
      expect(getMapsUrl(52, 13, null, 14)).toBe('https://google.com/maps/@52,13,14z');
      expect(getMapsUrl(52, 13, 'Berlin')).toBe('https://google.com/maps/place/Berlin/@52,13');
      expect(getMapsUrl(48, 16, 'Wien', 14)).toBe('https://google.com/maps/place/Wien/@48,16,14z');
    });
  });
});
