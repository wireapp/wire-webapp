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

describe('TypeUtil', () => {
  it('should check one type', () => {
    Proteus.util.TypeUtil.assert_is_instance(Array, []);
    return assert.throws(() => Proteus.util.TypeUtil.assert_is_instance(Array, {}));
  });

  it('should check multiple types', () => {
    Proteus.util.TypeUtil.assert_is_instance([Array, String], []);
    return assert.throws(() => Proteus.util.TypeUtil.assert_is_instance([Array, String], {}));
  });

  it('throws errors with error codes', () => {
    try {
      const instance = 1337;
      Proteus.util.TypeUtil.assert_is_instance(Uint8Array, instance);
    } catch (error) {
      assert.instanceOf(error, Proteus.errors.InputError.TypeError);
      assert.strictEqual(error.code, Proteus.errors.InputError.TypeError.CODE.CASE_401);
    }

    try {
      Proteus.util.TypeUtil.assert_is_integer('Hello');
    } catch (error) {
      assert.instanceOf(error, Proteus.errors.InputError.TypeError);
      assert.strictEqual(error.code, Proteus.errors.InputError.TypeError.CODE.CASE_403);
    }
  });
});
