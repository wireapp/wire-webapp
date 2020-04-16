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

import * as Proteus from '@wireapp/proteus';

describe('DecryptError', () => {
  describe('constructor', () => {
    it('constructs a default error code', () => {
      const correctErrorCode = 2;

      let error = new Proteus.errors.DecryptError.InvalidMessage();
      expect(error.code).toBe(correctErrorCode);

      error = new Proteus.errors.DecryptError.InvalidMessage('Custom Text');
      expect(error.code).toBe(correctErrorCode);
    });
  });

  describe('Wire for web compatibility', () => {
    const errorCode = 300;
    const errorMessage = 'The received message was too big.';

    it('uses the generic error class as namespace', () => {
      const error = new Proteus.errors.DecryptError.InvalidMessage(errorMessage, errorCode);
      expect(error.code).toBe(errorCode);
      expect(error.message).toBe(errorMessage);
    });

    it('assures that specializations are the same type as generics', () => {
      const error = new Proteus.errors.DecryptError.InvalidMessage(errorMessage, errorCode);
      expect(error instanceof Proteus.errors.DecryptError).toBe(true);
      expect(error instanceof Proteus.errors.DecryptError.InvalidMessage).toBe(true);
    });

    it('is possible to create an error from a generic class', () => {
      const error = new Proteus.errors.DecryptError();
      expect(error.message).toBeDefined();
    });
  });
});
