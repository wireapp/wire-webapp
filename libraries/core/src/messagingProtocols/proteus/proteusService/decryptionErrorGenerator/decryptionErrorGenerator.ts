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
import {errors as LegacyProteusErrors} from '@wireapp/proteus';

import {CoreCryptoError, ProteusError} from '@wireapp/core-crypto';

import {DecryptionError} from '../../../../errors/decryptionError';

export const ProteusErrors = {
  SessionNotFound: 102,
  InvalidMessage: 201,
  RemoteIdentityChanged: 204,
  InvalidSignature: 207,
  DuplicateMessage: 209,
  TooDistantFuture: 212,
  PreKeyMessageUnMatchedSignature: 406,
  Unknown: 999,
} as const;

type SenderInfo = {clientId: string; userId: QualifiedId};

function getErrorCode(error: unknown): number {
  if (!CoreCryptoError.Proteus.instanceOf(error)) {
    if (error instanceof LegacyProteusErrors.ProteusError) {
      return error.code;
    }

    return ProteusErrors.Unknown;
  }

  const proteusError = error.inner.exception;

  if (ProteusError.SessionNotFound.instanceOf(proteusError)) {
    return ProteusErrors.SessionNotFound;
  }

  if (ProteusError.RemoteIdentityChanged.instanceOf(proteusError)) {
    return ProteusErrors.RemoteIdentityChanged;
  }

  if (ProteusError.DuplicateMessage.instanceOf(proteusError)) {
    return ProteusErrors.DuplicateMessage;
  }

  if (ProteusError.Other.instanceOf(proteusError)) {
    return proteusError.inner.errorCode;
  }

  return ProteusErrors.Unknown;
}

export const generateDecryptionError = (senderInfo: SenderInfo, error: unknown): DecryptionError => {
  const {clientId, userId} = senderInfo;
  const sender = `${userId.id} (${clientId})`;

  const code = getErrorCode(error);

  const name = error instanceof Error ? error.name : undefined;
  const text = error instanceof Error ? error.message : String(error);
  const message = `Decryption error from ${sender} (name: ${name}) (message: ${text})`;

  return new DecryptionError(message, code);
};
