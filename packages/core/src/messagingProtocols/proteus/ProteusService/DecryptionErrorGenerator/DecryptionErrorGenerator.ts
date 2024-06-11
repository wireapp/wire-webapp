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

type SenderInfo = {clientId: string; userId: QualifiedId};
export const generateDecryptionError = (senderInfo: SenderInfo, error: any): DecryptionError => {
  const {clientId, userId} = senderInfo;
  const sender = `${userId.id} (${clientId})`;

  const coreCryptoCode = isCoreCryptoError(error) ? error.proteusErrorCode : null;
  const cryptoboxCode = isCryptoboxError(error) ? error.code : null;
  const code = coreCryptoCode ?? cryptoboxCode ?? ProteusErrors.Unknown;

  const message = `Decryption error from ${sender} (${error.message})`;

  return new DecryptionError(message, code);
};
