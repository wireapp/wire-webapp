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

describe('DecryptError', () => {
  describe('constructor', () => {
    it('constructs a default error code', () => {
      const correct_error_code = 2;

      let error = new Proteus.errors.DecryptError.InvalidMessage();
      assert(error.code === correct_error_code);

      error = new Proteus.errors.DecryptError.InvalidMessage('Custom Text');
      assert(error.code === correct_error_code);
    });
  });
});
