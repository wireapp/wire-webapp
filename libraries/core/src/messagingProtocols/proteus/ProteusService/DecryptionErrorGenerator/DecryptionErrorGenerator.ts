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

import {
  isProteusDuplicateMessageError,
  isProteusRemoteIdentityChangedError,
  isProteusSessionNotFoundError,
  isProteusError,
  ProteusErrorType,
} from '@wireapp/core-crypto';

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

const isCryptoboxError = (error: unknown): error is CryptoboxError => typeof (error as any)?.code === 'number';

type LegacyProteusError = {proteusErrorCode: number};
const hasProteusErrorCode = (error: unknown): error is LegacyProteusError =>
  typeof (error as any)?.proteusErrorCode === 'number';

type SenderInfo = {clientId: string; userId: QualifiedId};

function getErrorCode(error: unknown): number {
  if (isProteusSessionNotFoundError(error)) {
    return ProteusErrors.SessionNotFound;
  }

  if (isProteusRemoteIdentityChangedError(error)) {
    return ProteusErrors.RemoteIdentityChanged;
  }

  if (isProteusDuplicateMessageError(error)) {
    return ProteusErrors.DuplicateMessage;
  }

  if (isProteusError(error, ProteusErrorType.Other)) {
    return ProteusErrors.Unknown;
  }

  if (hasProteusErrorCode(error)) {
    return error.proteusErrorCode;
  }

  if (isCryptoboxError(error)) {
    return error.code;
  }

  return ProteusErrors.Unknown;
}

export const generateDecryptionError = (senderInfo: SenderInfo, error: unknown): DecryptionError => {
  const {clientId, userId} = senderInfo;
  const sender = `${userId.id} (${clientId})`;

  const code = getErrorCode(error);

  const name = (error as {name?: string})?.name;
  const text = (error as {message?: string})?.message ?? String(error);
  const message = `Decryption error from ${sender} (name: ${name}) (message: ${text})`;

  return new DecryptionError(message, code);
};
