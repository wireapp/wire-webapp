/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import {mapBackendError} from './backendErrorMapper';

import {
  InvalidCredentialsError,
  InvalidTokenError,
  MissingCookieError,
  MissingCookieAndTokenError,
  SuspendedAccountError,
  TokenExpiredError,
  LoginTooFrequentError,
  IdentifierExistsError,
} from '../auth/';
import {
  ConversationIsUnknownError,
  ConversationOperationError,
  MLSGroupOutOfSyncError,
  MLSInvalidLeafNodeSignatureError,
  MLSInvalidLeafNodeIndexError,
  MLSStaleMessageError,
} from '../conversation/';
import {InviteEmailInUseError, ServiceNotFoundError} from '../team/';
import {UserIsUnknownError} from '../user/';

import {BackendError, BackendErrorLabel, StatusCode} from './';

describe('mapBackendError', () => {
  describe('Focused critical cases', () => {
    it('maps "Invalid zauth token" to InvalidTokenError', () => {
      const error = new BackendError(
        'Invalid zauth token',
        BackendErrorLabel.INVALID_CREDENTIALS,
        StatusCode.FORBIDDEN,
      );
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(InvalidTokenError);
    });

    it('maps "Authentication failed." to InvalidCredentialsError', () => {
      const error = new BackendError(
        'Authentication failed.',
        BackendErrorLabel.INVALID_CREDENTIALS,
        StatusCode.FORBIDDEN,
      );
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(InvalidCredentialsError);
    });

    it('maps "Token expired" to TokenExpiredError', () => {
      const error = new BackendError('Token expired', BackendErrorLabel.INVALID_CREDENTIALS, StatusCode.FORBIDDEN);
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(TokenExpiredError);
    });

    it('maps "Missing cookie" to MissingCookieError', () => {
      const error = new BackendError('Missing cookie', BackendErrorLabel.INVALID_CREDENTIALS, StatusCode.FORBIDDEN);
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(MissingCookieError);
    });

    it('maps invalid conversation UUID to ConversationIsUnknownError', () => {
      const error = new BackendError(
        "[path] 'cnv' invalid: Failed reading: Invalid UUID",
        BackendErrorLabel.CLIENT_ERROR,
        StatusCode.BAD_REQUEST,
      );
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(ConversationIsUnknownError);
    });

    it('maps invalid user UUID to UserIsUnknownError', () => {
      const error = new BackendError(
        "[path] 'usr' invalid: Failed reading: Invalid UUID",
        BackendErrorLabel.CLIENT_ERROR,
        StatusCode.BAD_REQUEST,
      );
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(UserIsUnknownError);
    });

    it('maps suspended account to SuspendedAccountError', () => {
      const error = new BackendError('Account suspended.', BackendErrorLabel.SUSPENDED_ACCOUNT, StatusCode.FORBIDDEN);
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(SuspendedAccountError);
    });

    it('maps trimmed token message with surrounding spaces to InvalidTokenError (message normalization)', () => {
      const error = new BackendError('  Invalid token  ', BackendErrorLabel.INVALID_CREDENTIALS, StatusCode.FORBIDDEN);
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(InvalidTokenError);
    });

    it('maps missing cookie and token to MissingCookieAndTokenError', () => {
      const error = new BackendError(
        'Missing cookie and token',
        BackendErrorLabel.INVALID_CREDENTIALS,
        StatusCode.FORBIDDEN,
      );
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(MissingCookieAndTokenError);
    });

    it('maps invalid operation variant to ConversationOperationError (specific message)', () => {
      const error = new BackendError(
        'invalid operation for 1:1 conversations',
        BackendErrorLabel.INVALID_OPERATION,
        StatusCode.FORBIDDEN,
      );
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(ConversationOperationError);
      expect(mapped.message).toBe('Cannot leave 1:1 conversation.');
    });

    it('maps invalid operation default fallback when message not matched', () => {
      const error = new BackendError(
        'some other invalid operation',
        BackendErrorLabel.INVALID_OPERATION,
        StatusCode.FORBIDDEN,
      );
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(ConversationOperationError);
      expect(mapped.message).toBe('Cannot perform this operation.');
    });
  });

  describe('Fallback behavior', () => {
    it('falls back to default handler when message variant is unknown', () => {
      const error = new BackendError('unknown message', BackendErrorLabel.INVALID_CREDENTIALS, StatusCode.FORBIDDEN);
      const mapped = mapBackendError(error);
      expect(mapped).not.toBe(error);
      expect(mapped).toBeInstanceOf(BackendError);
      expect(mapped.message).toBe('Authentication failed because the token is invalid.');
    });
    it('returns original error when no handler exists for code and label', () => {
      const error = new BackendError('unknown message', BackendErrorLabel.CLIENT_ERROR, StatusCode.UNAUTHORIZED);
      const mapped = mapBackendError(error);
      expect(mapped).toBe(error);
    });

    it('returns original error when status code is unknown (e.g., 999) and label has no handler', () => {
      const error = new BackendError('weird status', BackendErrorLabel.CLIENT_ERROR, 999 as any);
      const mapped = mapBackendError(error);
      expect(mapped).toBe(error);
    });
  });

  describe('MLSGroupOutOfSyncError mapping', () => {
    it('maps MLS_GROUP_OUT_OF_SYNC without missing_users to MLSGroupOutOfSyncError with empty list', () => {
      const error = new BackendError('Group out of sync', BackendErrorLabel.MLS_GROUP_OUT_OF_SYNC, StatusCode.CONFLICT);
      const mapped = mapBackendError(error);

      expect(mapped).toBeInstanceOf(MLSGroupOutOfSyncError);
      expect((mapped as MLSGroupOutOfSyncError).missing_users).toEqual([]);
      expect(mapped.label).toBe(BackendErrorLabel.MLS_GROUP_OUT_OF_SYNC);
      expect(mapped.code).toBe(StatusCode.CONFLICT);
    });

    it('maps MLS_GROUP_OUT_OF_SYNC with missing_users in backend error data', () => {
      const missingUsers = [{id: '23951770-9c7e-4e52-9bc2-0544dc1d30c0', domain: 'wire.com'}];
      const error = new BackendError(
        'Group is out of sync',
        BackendErrorLabel.MLS_GROUP_OUT_OF_SYNC,
        StatusCode.CONFLICT,
        {
          code: StatusCode.CONFLICT,
          label: BackendErrorLabel.MLS_GROUP_OUT_OF_SYNC,
          message: 'Group is out of sync',
          missing_users: missingUsers,
        },
      );

      const mapped = mapBackendError(error);

      expect(mapped).toBeInstanceOf(MLSGroupOutOfSyncError);
      expect((mapped as MLSGroupOutOfSyncError).missing_users).toEqual(missingUsers);
      expect(mapped.message).toBe('Group is out of sync');
    });
  });

  describe('Additional mappings by status/label', () => {
    it('maps TOO_MANY_REQUESTS client error to LoginTooFrequentError', () => {
      const error = new BackendError('anything here', BackendErrorLabel.CLIENT_ERROR, StatusCode.TOO_MANY_REQUESTS);
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(LoginTooFrequentError);
      expect(mapped.message).toBe('Logins too frequent. User login temporarily disabled.');
    });

    it('maps CONFLICT KEY_EXISTS to IdentifierExistsError', () => {
      const error = new BackendError('ignored', BackendErrorLabel.KEY_EXISTS, StatusCode.CONFLICT);
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(IdentifierExistsError);
    });

    it('maps CONFLICT INVITE_EMAIL_EXISTS to InviteEmailInUseError', () => {
      const error = new BackendError('ignored', BackendErrorLabel.INVITE_EMAIL_EXISTS, StatusCode.CONFLICT);
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(InviteEmailInUseError);
    });

    it('maps NOT_FOUND NOT_FOUND to ServiceNotFoundError', () => {
      const error = new BackendError('ignored', BackendErrorLabel.NOT_FOUND, StatusCode.NOT_FOUND);
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(ServiceNotFoundError);
    });

    it('maps MLS invalid leaf node signature variant', () => {
      const error = new BackendError('', BackendErrorLabel.MLS_INVALID_LEAF_NODE_SIGNATURE, StatusCode.BAD_REQUEST);
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(MLSInvalidLeafNodeSignatureError);
    });
    it('maps MLS invalid leaf node index variant', () => {
      const error = new BackendError('', BackendErrorLabel.MLS_INVALID_LEAF_NODE_INDEX, StatusCode.BAD_REQUEST);
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(MLSInvalidLeafNodeIndexError);
    });

    it('maps MLS stale message conflict variant', () => {
      const error = new BackendError('epoch stale', BackendErrorLabel.MLS_STALE_MESSAGE, StatusCode.CONFLICT);
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(MLSStaleMessageError);
    });

    it('maps InvalidTokenError via consolidated invalid token messages Set when label is CLIENT_ERROR', () => {
      const error = new BackendError(
        'Failed reading: Invalid zauth token',
        BackendErrorLabel.CLIENT_ERROR,
        StatusCode.FORBIDDEN,
      );
      const mapped = mapBackendError(error);
      expect(mapped).toBeInstanceOf(InvalidTokenError);
    });
  });
});
