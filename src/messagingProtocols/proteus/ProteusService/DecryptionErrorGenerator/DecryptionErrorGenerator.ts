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

import {DecryptionError} from '../../../../errors/DecryptionError';

export const ProteusErrors = {
  InvalidMessage: 201,
  RemoteIdentityChanged: 204,
  InvalidSignature: 207,
  DuplicateMessage: 209,
  Unknown: 999,
} as const;

type CoreCryptoErrors = keyof typeof ProteusErrors;
type ProteusErrorCode = (typeof ProteusErrors)[CoreCryptoErrors];

const CoreCryptoErrorMapping: Record<CoreCryptoErrors, ProteusErrorCode> = {
  InvalidMessage: ProteusErrors.InvalidMessage,
  RemoteIdentityChanged: ProteusErrors.RemoteIdentityChanged,
  InvalidSignature: ProteusErrors.InvalidSignature,
  DuplicateMessage: ProteusErrors.DuplicateMessage,
  Unknown: ProteusErrors.Unknown,
};

const mapCoreCryptoError = (error: any): ProteusErrorCode => {
  return CoreCryptoErrorMapping[error.message as CoreCryptoErrors] ?? ProteusErrors.Unknown;
};

const getErrorMessage = (code: ProteusErrorCode, userId: QualifiedId, clientId: string, error: Error): string => {
  const sender = `${userId.id} (${clientId})`;
  switch (code) {
    case ProteusErrors.InvalidMessage:
      return `Invalid message from ${sender}`;

    case ProteusErrors.InvalidSignature:
      return `Invalid signature from ${sender}`;

    case ProteusErrors.RemoteIdentityChanged:
      return `Remote identity of ${sender} has changed`;

    case ProteusErrors.DuplicateMessage:
      return `Message from ${sender} was decrypted twice`;

    case ProteusErrors.Unknown:
      return `Unknown decryption error from ${sender} (${error.message})`;

    default:
      return `Unhandled error code "${code}" from ${sender} (${error.message})`;
  }
};

type SenderInfo = {clientId: string; userId: QualifiedId};
export const generateDecryptionError = (senderInfo: SenderInfo, error: any): DecryptionError => {
  const {clientId: remoteClientId, userId} = senderInfo;

  const code = error.code || mapCoreCryptoError(error);
  const message = getErrorMessage(code, userId, remoteClientId, error);

  return new DecryptionError(message, code);
};
