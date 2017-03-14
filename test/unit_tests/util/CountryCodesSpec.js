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

// grunt test_init && grunt test_run:util/CountryCodes

describe('z.util.CountryCodes', function() {
  describe('get_country_code', function() {
    it('returns the county code for an existing ISO name', function() {
      var code = z.util.CountryCodes.get_country_code('DE');
      expect(code).toBe(49);
    });
    it('returns undefined for a non-existent ISO name', function() {
      var code = z.util.CountryCodes.get_country_code('XY');
      expect(code).toBeUndefined();
    });
  });
  describe('get_country_by_code', function() {
    it('returns the most populated country for country code ', function() {
      var iso_name = z.util.CountryCodes.get_country_by_code(49);
      expect(iso_name).toBe('DE');
    });
    it('returns the most populated country for country code ', function() {
      var iso_name = z.util.CountryCodes.get_country_by_code(7);
      expect(iso_name).toBe('RU');
    });
    it('returns undefined for a non-existent country code', function() {
      var iso_name = z.util.CountryCodes.get_country_by_code(9999);
      expect(iso_name).toBeUndefined();
    });
  });
});
