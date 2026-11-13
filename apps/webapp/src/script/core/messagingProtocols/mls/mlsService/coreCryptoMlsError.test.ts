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

import {QualifiedId} from '../../../../apiClient/user/qualifiedId';

import {CoreCryptoError, MlsError} from '@wireapp/core-crypto';

import {
  UPLOAD_COMMIT_BUNDLE_ABORT_REASONS,
  getMLSGroupOutOfSyncErrorMissingUsers,
  isBrokenMLSConversationError,
  isCoreCryptoMLSBufferedMessageError,
  isCoreCryptoMLSConversationAlreadyExistsError,
  isCoreCryptoMLSInvalidCredentialsError,
  isCoreCryptoMLSWrongEpochError,
  isMlsConversationNotFoundError,
  isMLSGroupOutOfSyncError,
  isMLSStaleMessageError,
  isMlsMessageRejectedError,
  serializeAbortReason,
  shouldMLSDecryptionErrorBeIgnored,
} from './coreCryptoMlsError';

describe('CoreCryptoMLSError helpers', () => {
  describe('epoch and conversation existence guards', () => {
    it('detects the nested V11 WrongEpoch variant', () => {
      const err = CoreCryptoError.Mls.new({mlsError: MlsError.WrongEpoch.new()});
      expect(isCoreCryptoMLSWrongEpochError(err)).toBe(true);

      const other = CoreCryptoError.Mls.new({mlsError: MlsError.Other.new({msg: 'nope'})});
      expect(isCoreCryptoMLSWrongEpochError(other)).toBe(false);
      expect(isCoreCryptoMLSWrongEpochError('not-an-error')).toBe(false);
    });

    it('detects the nested V11 ConversationAlreadyExists variant', () => {
      const err = CoreCryptoError.Mls.new({
        mlsError: MlsError.ConversationAlreadyExists.new({conversationId: new Uint8Array([1, 2, 3])}),
      });
      expect(isCoreCryptoMLSConversationAlreadyExistsError(err)).toBe(true);

      const other = CoreCryptoError.Mls.new({mlsError: MlsError.Other.new({msg: 'nope'})});
      expect(isCoreCryptoMLSConversationAlreadyExistsError(other)).toBe(false);
      expect(isCoreCryptoMLSConversationAlreadyExistsError(42)).toBe(false);
    });

    it('detects nested V11 MlsError.Other when the local MLS group is missing', () => {
      const err = CoreCryptoError.Mls.new({
        mlsError: MlsError.Other.new({msg: "Couldn't find conversation"}),
      });
      expect(isMlsConversationNotFoundError(err)).toBe(true);
      expect(isMlsConversationNotFoundError(new Error('other'))).toBe(false);
    });

    it('detects the V11 invalid-local-credentials error', () => {
      const invalidCredentialsError = CoreCryptoError.Mls.new({
        mlsError: MlsError.Other.new({
          msg: 'There are invalid CredentialRefs that should be removed. Hex encoded sha256 hashes: abc123',
        }),
      });

      expect(isCoreCryptoMLSInvalidCredentialsError(invalidCredentialsError)).toBe(true);
      expect(
        isCoreCryptoMLSInvalidCredentialsError(
          CoreCryptoError.Mls.new({mlsError: MlsError.Other.new({msg: 'CRL endpoint unavailable'})}),
        ),
      ).toBe(false);
      expect(isCoreCryptoMLSInvalidCredentialsError(new Error('CRL endpoint unavailable'))).toBe(false);
    });
  });

  describe('shouldMLSDecryptionErrorBeIgnored', () => {
    const errorsToIgnore = [
      MlsError.StaleCommit.new(),
      MlsError.StaleProposal.new(),
      MlsError.DuplicateMessage.new(),
      MlsError.UnmergedPendingGroup.new(),
    ];

    it('returns true for known ignorable V11 variants', () => {
      for (const mlsError of errorsToIgnore) {
        const err = CoreCryptoError.Mls.new({mlsError});
        expect(shouldMLSDecryptionErrorBeIgnored(err)).toBe(true);
      }
    });

    it('returns true for V11 MlsError.Other with expected commit/proposals message', () => {
      const err = CoreCryptoError.Mls.new({
        mlsError: MlsError.Other.new({
          msg: 'Incoming message is a commit for which we have not yet received all the proposals: details...',
        }),
      });
      expect(shouldMLSDecryptionErrorBeIgnored(err)).toBe(true);
    });

    it('returns false for other errors or non-Error values', () => {
      const err = CoreCryptoError.Mls.new({mlsError: MlsError.Other.new({msg: 'some real failure'})});
      expect(shouldMLSDecryptionErrorBeIgnored(err)).toBe(false);
      expect(shouldMLSDecryptionErrorBeIgnored('not-an-error')).toBe(false);
    });

    it('returns false for buffered messages, which are tracked for recovery instead', () => {
      for (const mlsError of [MlsError.BufferedFutureMessage.new(), MlsError.BufferedCommit.new()]) {
        expect(shouldMLSDecryptionErrorBeIgnored(CoreCryptoError.Mls.new({mlsError}))).toBe(false);
      }
    });
  });

  describe('isCoreCryptoMLSBufferedMessageError', () => {
    it('detects buffered future messages and buffered commits', () => {
      expect(
        isCoreCryptoMLSBufferedMessageError(CoreCryptoError.Mls.new({mlsError: MlsError.BufferedFutureMessage.new()})),
      ).toBe(true);
      expect(
        isCoreCryptoMLSBufferedMessageError(CoreCryptoError.Mls.new({mlsError: MlsError.BufferedCommit.new()})),
      ).toBe(true);
    });

    it('returns false for other errors or non-Error values', () => {
      expect(
        isCoreCryptoMLSBufferedMessageError(CoreCryptoError.Mls.new({mlsError: MlsError.DuplicateMessage.new()})),
      ).toBe(false);
      expect(isCoreCryptoMLSBufferedMessageError(CoreCryptoError.Mls.new({mlsError: MlsError.WrongEpoch.new()}))).toBe(
        false,
      );
      expect(isCoreCryptoMLSBufferedMessageError('not-an-error')).toBe(false);
    });
  });

  describe('abort reason based guards', () => {
    function makeRejectedError(reason: string): CoreCryptoError {
      return CoreCryptoError.Mls.new({mlsError: MlsError.MessageRejected.new({reason})});
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

      expect(() => {
        return getMLSGroupOutOfSyncErrorMissingUsers(err);
      }).toThrow('Error is not MLSGroupOutOfSyncError');
    });

    it('returns false for non-mls message rejected errors', () => {
      const err = CoreCryptoError.Mls.new({mlsError: MlsError.Other.new({msg: 'other MLS error'})});

      expect(isBrokenMLSConversationError(err)).toBe(false);
      expect(isMLSStaleMessageError(err)).toBe(false);
      expect(isMLSGroupOutOfSyncError(err)).toBe(false);
    });

    it('recognizes the nested V11 message-rejected error shape', () => {
      const err = makeRejectedError(
        serializeAbortReason({message: UPLOAD_COMMIT_BUNDLE_ABORT_REASONS.MLS_STALE_MESSAGE}),
      );

      expect(isMlsMessageRejectedError(err)).toBe(true);
      expect(isMlsMessageRejectedError(MlsError.MessageRejected.new({reason: 'not wrapped'}))).toBe(false);
    });

    it('returns false instead of throwing for a malformed rejection reason', () => {
      const err = makeRejectedError('not-json');

      expect(isBrokenMLSConversationError(err)).toBe(false);
      expect(isMLSStaleMessageError(err)).toBe(false);
      expect(isMLSGroupOutOfSyncError(err)).toBe(false);
    });
  });
});
