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

import {QualifiedId} from '@wireapp/api-client/lib/user';

import {CoreCryptoError} from '@wireapp/core-crypto';

import {DecryptionError} from '../../../../errors/DecryptionError';

export const ProteusErrors = {
  SessionNotFound: 102,
  InvalidMessage: 201,
  RemoteIdentityChanged: 204,
  InvalidSignature: 207,
  DuplicateMessage: 209,
  Unknown: 999,
} as const;

type CryptoboxError = Error & {code: number};

const isCoreCryptoError = (error: any): error is CoreCryptoError => {
  return 'proteusErrorCode' in error;
};

const isCryptoboxError = (error: any): error is CryptoboxError => {
  return 'code' in error;
};

export const CORE_CRYPTO_PROTEUS_ERROR_NAMES = {
  ProteusErrorSessionNotFound: 'ProteusErrorSessionNotFound',
  ProteusErrorRemoteIdentityChanged: 'ProteusErrorRemoteIdentityChanged',
  ProteusErrorDuplicateMessage: 'ProteusErrorDuplicateMessage',
};

type SenderInfo = {clientId: string; userId: QualifiedId};

function getErrorCode(error: CoreCryptoError): number {
  if (isCoreCryptoError(error) && typeof error.proteusErrorCode === 'number') {
    return error.proteusErrorCode;
  }

  if (isCryptoboxError(error) && typeof error.code === 'number') {
    return error.code;
  }

  if (error.name === CORE_CRYPTO_PROTEUS_ERROR_NAMES.ProteusErrorSessionNotFound) {
    return ProteusErrors.SessionNotFound;
  }

  if (error.name === CORE_CRYPTO_PROTEUS_ERROR_NAMES.ProteusErrorRemoteIdentityChanged) {
    return ProteusErrors.RemoteIdentityChanged;
  }

  if (error.name === CORE_CRYPTO_PROTEUS_ERROR_NAMES.ProteusErrorDuplicateMessage) {
    return ProteusErrors.DuplicateMessage;
  }

  return ProteusErrors.Unknown;
}

export const generateDecryptionError = (senderInfo: SenderInfo, error: any): DecryptionError => {
  const {clientId, userId} = senderInfo;
  const sender = `${userId.id} (${clientId})`;

  const code = getErrorCode(error);

  const message = `Decryption error from ${sender} (name: ${error.name}) (message: ${error.message})`;

  return new DecryptionError(message, code);
};
