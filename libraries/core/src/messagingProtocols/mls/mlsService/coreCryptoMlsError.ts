/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {Result, result} from 'true-myth';

import {CoreCryptoError, MlsError} from '@wireapp/core-crypto';

export const CORE_CRYPTO_ERROR_NAMES = {
  MlsErrorConversationAlreadyExists: 'MlsErrorConversationAlreadyExists',
  MlsErrorDuplicateMessage: 'MlsErrorDuplicateMessage',
  MlsErrorBufferedFutureMessage: 'MlsErrorBufferedFutureMessage',
  MlsErrorMessageEpochTooOld: 'MlsErrorMessageEpochTooOld',
  MlsErrorSelfCommitIgnored: 'MlsErrorSelfCommitIgnored',
  MlsErrorUnmergedPendingGroup: 'MlsErrorUnmergedPendingGroup',
  MlsErrorStaleProposal: 'MlsErrorStaleProposal',
  MlsErrorStaleCommit: 'MlsErrorStaleCommit',
  MlsErrorOther: 'MlsErrorOther',
  ProteusErrorSessionNotFound: 'ProteusErrorSessionNotFound',
  ProteusErrorRemoteIdentityChanged: 'ProteusErrorRemoteIdentityChanged',
  MlsErrorWrongEpoch: 'MlsErrorWrongEpoch',
};

export const isCoreCryptoMLSWrongEpochError = (error: unknown): boolean => {
  return error instanceof Error && error.name === CORE_CRYPTO_ERROR_NAMES.MlsErrorWrongEpoch;
};

export const isCoreCryptoMLSConversationAlreadyExistsError = (error: unknown): boolean => {
  return error instanceof Error && error.name === CORE_CRYPTO_ERROR_NAMES.MlsErrorConversationAlreadyExists;
};

const mlsDecryptionErrorNamesToIgnore: string[] = [
  CORE_CRYPTO_ERROR_NAMES.MlsErrorStaleCommit,
  CORE_CRYPTO_ERROR_NAMES.MlsErrorStaleProposal,
  CORE_CRYPTO_ERROR_NAMES.MlsErrorDuplicateMessage,
  CORE_CRYPTO_ERROR_NAMES.MlsErrorBufferedFutureMessage,
  CORE_CRYPTO_ERROR_NAMES.MlsErrorUnmergedPendingGroup,
];

// This error is thrown when we receive a commit for which we have not yet received all the proposals.
// This is a normal situation and we should ignore this error.
// This error will get a proper name in the future.
const isOtherErrorToIgnore = (error: Error): boolean => {
  return (
    error.name === CORE_CRYPTO_ERROR_NAMES.MlsErrorOther &&
    error.message.startsWith('Incoming message is a commit for which we have not yet received all the proposals')
  );
};

const CONVERSATION_NOT_FOUND_MESSAGE = "Couldn't find conversation";

/** Local MLS group was removed (e.g. after leaving a call subconversation). */
export const isMlsConversationNotFoundError = (error: unknown): boolean => {
  if (!(error instanceof Error) || error.name !== CORE_CRYPTO_ERROR_NAMES.MlsErrorOther) {
    return false;
  }

  if (error.message.includes(CONVERSATION_NOT_FOUND_MESSAGE)) {
    return true;
  }

  const nestedMessage = (error as {context?: {context?: {msg?: string}}}).context?.context?.msg;
  return nestedMessage === CONVERSATION_NOT_FOUND_MESSAGE;
};

export const shouldMLSDecryptionErrorBeIgnored = (error: unknown): error is Error => {
  return (
    error instanceof Error && (mlsDecryptionErrorNamesToIgnore.includes(error.name) || isOtherErrorToIgnore(error))
  );
};

export const UPLOAD_COMMIT_BUNDLE_ABORT_REASONS = {
  BROKEN_MLS_CONVERSATION: 'BROKEN_MLS_CONVERSATION',
  MLS_STALE_MESSAGE: 'MLS_STALE_MESSAGE',
  MLS_GROUP_OUT_OF_SYNC: 'MLS_GROUP_OUT_OF_SYNC',
  OTHER: 'OTHER',
};

export type ConversationAlreadyExistsError = Error & {
  context?: {
    context?: {
      conversationId?: ArrayLike<number>;
    };
  };
};

type MessageRejectedError = InstanceType<typeof CoreCryptoError.Mls> & {
  inner: {
    mlsError: InstanceType<typeof MlsError.MessageRejected>;
  };
};

export function isMlsMessageRejectedError(error: unknown): error is MessageRejectedError {
  return CoreCryptoError.Mls.instanceOf(error) && MlsError.MessageRejected.instanceOf(error.inner.mlsError);
}

const hasAbortReason = (error: unknown, message: AbortReasons['message']): error is MessageRejectedError => {
  if (!isMlsMessageRejectedError(error)) {
    return false;
  }

  return deserializeAbortReason(error.inner.mlsError.inner.reason).match({
    Ok: reason => reason.message === message,
    Err: () => false,
  });
};

export function isBrokenMLSConversationError(error: unknown): error is MessageRejectedError {
  return hasAbortReason(error, UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.BROKEN_MLS_CONVERSATION);
}

export function isMLSStaleMessageError(error: unknown): error is MessageRejectedError {
  return hasAbortReason(error, UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_STALE_MESSAGE);
}

export function isMLSGroupOutOfSyncError(error: unknown): error is MessageRejectedError {
  return hasAbortReason(error, UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_GROUP_OUT_OF_SYNC);
}

export function getMLSGroupOutOfSyncErrorMissingUsers(error: unknown): QualifiedId[] {
  if (isMLSGroupOutOfSyncError(error)) {
    return deserializeAbortReason(error.inner.mlsError.inner.reason).match({
      Ok: reason => (reason as AbortReasonMLSGroupOutOfSync).missing_users,
      Err: () => [],
    });
  }

  throw new Error('Error is not MLSGroupOutOfSyncError');
}

type AbortReasonBrokenMLSConversation = {
  message: typeof UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.BROKEN_MLS_CONVERSATION;
};

type AbortReasonMLSStaleMessage = {
  message: typeof UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_STALE_MESSAGE;
};

type AbortReasonMLSGroupOutOfSync = {
  message: typeof UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_GROUP_OUT_OF_SYNC;
  missing_users: QualifiedId[];
};

type AbortReasonOther = {
  message: string;
};

type AbortReasons =
  AbortReasonBrokenMLSConversation | AbortReasonMLSStaleMessage | AbortReasonMLSGroupOutOfSync | AbortReasonOther;

export function serializeAbortReason(reason: AbortReasons): string {
  return JSON.stringify(reason);
}

function deserializeAbortReason(reasonString: string): Result<AbortReasons, unknown> {
  return result.tryOrElse(
    error => error,
    () => JSON.parse(reasonString) as AbortReasons,
  );
}
