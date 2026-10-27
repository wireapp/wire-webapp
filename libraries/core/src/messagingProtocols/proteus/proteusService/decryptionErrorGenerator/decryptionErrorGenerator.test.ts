/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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

import {generateDecryptionError, ProteusErrors} from './decryptionErrorGenerator';

import {CoreCryptoError, ProteusError} from '@wireapp/core-crypto';
import {errors as LegacyProteusErrors} from '@wireapp/proteus';

import {DecryptionError} from '../../../../errors/decryptionError';

const basePayload = {userId: {id: 'user1', domain: 'domain'}, clientId: 'client1'};

const createStructuredProteusError = (errorCode: number): CoreCryptoError => {
  return CoreCryptoError.Proteus.new({exception: ProteusError.Other.new({errorCode})});
};

describe('generateDecryptionError', () => {
  it.each([ProteusErrors.TooDistantFuture, ProteusErrors.PreKeyMessageUnMatchedSignature])(
    'preserves structured CoreCrypto Proteus error code %s',
    errorCode => {
      const coreCryptoError = createStructuredProteusError(errorCode);

      const error = generateDecryptionError(basePayload, coreCryptoError);

      expect(error).toBeInstanceOf(DecryptionError);
      expect(error.code).toBe(errorCode);
    },
  );

  it.each([
    [ProteusError.SessionNotFound.new(), ProteusErrors.SessionNotFound],
    [ProteusError.RemoteIdentityChanged.new(), ProteusErrors.RemoteIdentityChanged],
    [ProteusError.DuplicateMessage.new(), ProteusErrors.DuplicateMessage],
  ])('maps a nested V11 Proteus error variant', (proteusError, expectedCode) => {
    const coreCryptoError = CoreCryptoError.Proteus.new({exception: proteusError});

    expect(generateDecryptionError(basePayload, coreCryptoError).code).toBe(expectedCode);
  });

  it.each([Math.floor(Math.random() * 100), 0])('handles legacy Proteus errors from Cryptobox', code => {
    const legacyError = new LegacyProteusErrors.DecryptError('decryption error', code);
    const error = generateDecryptionError(basePayload, legacyError);
    expect(error).toBeInstanceOf(DecryptionError);
    expect(error.message).toBe(`Decryption error from user1 (client1) (name: Error) (message: ${legacyError.message})`);
    expect(error.code).toBe(legacyError.code);
  });
});
