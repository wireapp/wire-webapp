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

// grunt test_run:util/ObjectUtil

'use strict';

describe('z.util.ObjectUtil', () => {
  describe('escapeProperties', () => {
    it('escapes all properties of an object', () => {
      const object = {
        age: '<b>25</b>',
        favorite: {
          place: '<b>Berlin</b>',
        },
        name: 'Lara',
      };

      const escaped_object = z.util.ObjectUtil.escapeProperties(object);

      expect(escaped_object.age).toBe('&lt;b&gt;25&lt;/b&gt;');
      expect(escaped_object.favorite.place).toBe('&lt;b&gt;Berlin&lt;/b&gt;');
      expect(escaped_object.name).toBe('Lara');
    });
  });
});
