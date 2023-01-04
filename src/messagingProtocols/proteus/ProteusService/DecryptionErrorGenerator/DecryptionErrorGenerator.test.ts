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

import {generateDecryptionError, ProteusErrors} from './DecryptionErrorGenerator';

import {DecryptionError} from '../../../../errors/DecryptionError';

const basePayload = {userId: {id: 'user1', domain: 'domain'}, clientId: 'client1'};

describe('generateDecryptionError', () => {
  it('handles unknown decryption error', () => {
    const message = 'decryption error';
    const error = generateDecryptionError(basePayload, new Error(message));
    expect(error).toBeInstanceOf(DecryptionError);
    expect(error.message).toBe(`Unknown decryption error from user1 (client1) (${message})`);
    expect(error.code).toBe(ProteusErrors.Unknown);
  });

  it('handles remote identity changed', () => {
    const error = generateDecryptionError(basePayload, new Error('RemoteIdentityChanged'));
    expect(error).toBeInstanceOf(DecryptionError);
    expect(error.message).toBe('Remote identity of user1 (client1) has changed');
    expect(error.code).toBe(ProteusErrors.RemoteIdentityChanged);
  });

  it('handles invalid message', () => {
    const error = generateDecryptionError(basePayload, new Error('InvalidMessage'));
    expect(error).toBeInstanceOf(DecryptionError);
    expect(error.message).toBe('Invalid message from user1 (client1)');
    expect(error.code).toBe(ProteusErrors.InvalidMessage);
  });

  it('handles duplicated message', () => {
    const error = generateDecryptionError(basePayload, new Error('DuplicateMessage'));
    expect(error).toBeInstanceOf(DecryptionError);
    expect(error.message).toBe('Message from user1 (client1) was decrypted twice');
    expect(error.code).toBe(ProteusErrors.DuplicateMessage);
  });

  it('handles invalid signature', () => {
    const error = generateDecryptionError(basePayload, new Error('InvalidSignature'));
    expect(error).toBeInstanceOf(DecryptionError);
    expect(error.message).toBe('Invalid signature from user1 (client1)');
    expect(error.code).toBe(ProteusErrors.InvalidSignature);
  });
});
