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

const {StringUtil} = require('@wireapp/commons');

describe('StringUtil', () => {
  describe('"capitalize"', () => {
    it('does not lowercase other characters', () => {
      const test = 'aBCD';
      const expected = 'ABCD';
      const actual = StringUtil.capitalize(test);
      expect(actual).toEqual(expected);
    });

    it('capitalizes first letter', () => {
      const test = 'abcd';
      const expected = 'Abcd';
      const actual = StringUtil.capitalize(test);
      expect(actual).toEqual(expected);
    });
  });
});
