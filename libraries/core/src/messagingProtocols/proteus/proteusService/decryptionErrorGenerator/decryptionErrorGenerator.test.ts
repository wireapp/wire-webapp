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

import {ErrorType, ProteusErrorType} from '@wireapp/core-crypto';

import {DecryptionError} from '../../../../errors/decryptionError';

const basePayload = {userId: {id: 'user1', domain: 'domain'}, clientId: 'client1'};

const createStructuredProteusError = (errorCode?: number) =>
  Object.assign(new Error('proteus decryption error'), {
    name: 'ProteusErrorOther',
    errorStack: [],
    type: ErrorType.Proteus,
    context: {
      type: ProteusErrorType.Other,
      context: errorCode === undefined ? {} : {errorCode},
    },
  });

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

  it('falls back to the unknown code for a malformed structured CoreCrypto Proteus error', () => {
    const coreCryptoError = createStructuredProteusError();

    const error = generateDecryptionError(basePayload, coreCryptoError);

    expect(error.code).toBe(ProteusErrors.Unknown);
  });

  it.each([Math.floor(Math.random() * 100), 0])('handles coreCrypto error', proteusErrorCode => {
    const coreCryptoError = {proteusErrorCode, message: 'decryption error'};
    const error = generateDecryptionError(basePayload, coreCryptoError);
    expect(error).toBeInstanceOf(DecryptionError);
    expect(error.message).toBe(
      `Decryption error from user1 (client1) (name: undefined) (message: ${coreCryptoError.message})`,
    );
    expect(error.code).toBe(coreCryptoError.proteusErrorCode);
  });

  it.each([Math.floor(Math.random() * 100), 0])('handles cryptobox error', code => {
    const coreCryptoError = {code, message: 'decryption error'};
    const error = generateDecryptionError(basePayload, coreCryptoError);
    expect(error).toBeInstanceOf(DecryptionError);
    expect(error.message).toBe(
      `Decryption error from user1 (client1) (name: undefined) (message: ${coreCryptoError.message})`,
    );
    expect(error.code).toBe(coreCryptoError.code);
  });
});
