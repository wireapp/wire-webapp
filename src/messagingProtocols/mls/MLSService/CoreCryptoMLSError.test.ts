/*
 * Wire
 * Copyright (C) 2025 Wire Swiss GmbH
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

import {ErrorType, MlsErrorType} from '@wireapp/core-crypto';

import {
  CORE_CRYPTO_ERROR_NAMES,
  UPLOAD_COMMIT_BUNDLE_ABORT_REASONS,
  getMLSGroupOutOfSyncErrorMissingUsers,
  isBrokenMLSConversationError,
  isCoreCryptoMLSConversationAlreadyExistsError,
  isCoreCryptoMLSWrongEpochError,
  isMLSGroupOutOfSyncError,
  isMLSStaleMessageError,
  serializeAbortReason,
  shouldMLSDecryptionErrorBeIgnored,
} from './CoreCryptoMLSError';

describe('CoreCryptoMLSError helpers', () => {
  describe('epoch and conversation existence guards', () => {
    it('detects MlsErrorWrongEpoch by name', () => {
      const err = new Error('wrong epoch');
      err.name = CORE_CRYPTO_ERROR_NAMES.MlsErrorWrongEpoch;
      expect(isCoreCryptoMLSWrongEpochError(err)).toBe(true);

      const other = new Error('nope');
      expect(isCoreCryptoMLSWrongEpochError(other)).toBe(false);
      expect(isCoreCryptoMLSWrongEpochError('not-an-error')).toBe(false);
    });

    it('detects MlsErrorConversationAlreadyExists by name', () => {
      const err = new Error('already exists');
      err.name = CORE_CRYPTO_ERROR_NAMES.MlsErrorConversationAlreadyExists;
      expect(isCoreCryptoMLSConversationAlreadyExistsError(err)).toBe(true);

      const other = new Error('nope');
      expect(isCoreCryptoMLSConversationAlreadyExistsError(other)).toBe(false);
      expect(isCoreCryptoMLSConversationAlreadyExistsError(42)).toBe(false);
    });
  });

  describe('shouldMLSDecryptionErrorBeIgnored', () => {
    const namesToIgnore = [
      CORE_CRYPTO_ERROR_NAMES.MlsErrorStaleCommit,
      CORE_CRYPTO_ERROR_NAMES.MlsErrorStaleProposal,
      CORE_CRYPTO_ERROR_NAMES.MlsErrorDuplicateMessage,
      CORE_CRYPTO_ERROR_NAMES.MlsErrorBufferedFutureMessage,
      CORE_CRYPTO_ERROR_NAMES.MlsErrorUnmergedPendingGroup,
    ];

    it('returns true for known ignorable error names', () => {
      for (const name of namesToIgnore) {
        const err = new Error('ignore me');
        err.name = name;
        expect(shouldMLSDecryptionErrorBeIgnored(err)).toBe(true);
      }
    });

    it('returns true for generic MlsErrorOther with expected commit/proposals message', () => {
      const err = new Error(
        'Incoming message is a commit for which we have not yet received all the proposals: details...',
      );
      err.name = CORE_CRYPTO_ERROR_NAMES.MlsErrorOther;
      expect(shouldMLSDecryptionErrorBeIgnored(err)).toBe(true);
    });

    it('returns false for other errors or non-Error values', () => {
      const err = new Error('some real failure');
      err.name = 'RandomErrorName';
      expect(shouldMLSDecryptionErrorBeIgnored(err)).toBe(false);
      expect(shouldMLSDecryptionErrorBeIgnored('not-an-error')).toBe(false);
    });
  });

  describe('abort reason based guards', () => {
    function makeRejectedError(reason: string) {
      return {
        type: ErrorType.Mls,
        context: {
          type: MlsErrorType.MessageRejected,
          context: {
            reason,
          },
        },
      };
    }

    it('detects broken MLS conversation errors', () => {
      const err = makeRejectedError(
        serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.BROKEN_MLS_CONVERSATION}),
      );

      expect(isBrokenMLSConversationError(err)).toBe(true);
      expect(isMLSStaleMessageError(err)).toBe(false);
      expect(isMLSGroupOutOfSyncError(err)).toBe(false);
    });

    it('detects MLS stale message errors', () => {
      const err = makeRejectedError(
        serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_STALE_MESSAGE}),
      );

      expect(isMLSStaleMessageError(err)).toBe(true);
      expect(isBrokenMLSConversationError(err)).toBe(false);
      expect(isMLSGroupOutOfSyncError(err)).toBe(false);
    });

    it('detects MLS group out-of-sync errors and exposes missing users', () => {
      const missing: QualifiedId[] = [
        {id: 'u1', domain: 'example.com'},
        {id: 'u2', domain: 'example.com'},
      ];
      const err = makeRejectedError(
        serializeAbortReason({
          message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_GROUP_OUT_OF_SYNC,
          missing_users: missing,
        }),
      );

      expect(isMLSGroupOutOfSyncError(err)).toBe(true);
      expect(getMLSGroupOutOfSyncErrorMissingUsers(err)).toEqual(missing);
    });

    it('throws when getting missing users from non-MLSGroupOutOfSync error', () => {
      const err = makeRejectedError(
        serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_STALE_MESSAGE}),
      );

      expect(() => getMLSGroupOutOfSyncErrorMissingUsers(err)).toThrow('Error is not MLSGroupOutOfSyncError');
    });

    it('returns false for non-mls message rejected errors', () => {
      const err = {
        type: ErrorType.Mls,
        context: {
          type: MlsErrorType.Other,
          context: {
            reason: serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_STALE_MESSAGE}),
          },
        },
      };

      expect(isBrokenMLSConversationError(err)).toBe(false);
      expect(isMLSStaleMessageError(err)).toBe(false);
      expect(isMLSGroupOutOfSyncError(err)).toBe(false);
    });
  });
});
