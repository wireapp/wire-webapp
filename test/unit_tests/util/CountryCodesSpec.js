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

// grunt test_init && grunt test_run:util/CountryCodes

'use strict';

describe('z.util.CountryCodes', () => {
  describe('getCountryCode', () => {
    it('returns the county code for an existing ISO name', () => {
      expect(z.util.CountryCodes.getCountryCode('DE')).toBe(49);
    });

    it('returns undefined for a non-existent ISO name', () => {
      expect(z.util.CountryCodes.getCountryCode('XY')).toBeUndefined();
    });
  });

  describe('getCountryByCode', () => {
    it('returns the most populated country for country code ', () => {
      expect(z.util.CountryCodes.getCountryByCode(49)).toBe('DE');
    });

    it('returns the most populated country for country code ', () => {
      expect(z.util.CountryCodes.getCountryByCode(7)).toBe('RU');
    });

    it('returns undefined for a non-existent country code', () => {
      expect(z.util.CountryCodes.getCountryByCode(9999)).toBeUndefined();
    });
  });
});
