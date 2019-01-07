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

describe('z.location.LocationRepository', () => {
  describe('getMapsUrl', () => {
    it('should return the proper urls', () => {
      const locationRepository = new z.location.LocationRepository({});

      expect(locationRepository.getMapsUrl(52, 13)).toBe('https://google.com/maps/@52,13');
      expect(locationRepository.getMapsUrl(52, 13, null, 14)).toBe('https://google.com/maps/@52,13,14z');
      expect(locationRepository.getMapsUrl(52, 13, 'Berlin')).toBe('https://google.com/maps/place/Berlin/@52,13');
      expect(locationRepository.getMapsUrl(48, 16, 'Wien', 14)).toBe('https://google.com/maps/place/Wien/@48,16,14z');
    });
  });
});
