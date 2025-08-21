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

import {BackendErrorMapper} from './BackendErrorMapper';

import {
  InvalidCredentialsError,
  InvalidTokenError,
  MissingCookieError,
  SuspendedAccountError,
  TokenExpiredError,
} from '../auth/';
import {ConversationIsUnknownError} from '../conversation/';
import {UserIsUnknownError} from '../user/';

import {BackendError, BackendErrorLabel, StatusCode} from './';

describe('BackendErrorMapper', () => {
  describe('Focused critical cases', () => {
    it('maps "Invalid zauth token" to InvalidTokenError', () => {
      const error = new BackendError(
        'Invalid zauth token',
        BackendErrorLabel.INVALID_CREDENTIALS,
        StatusCode.FORBIDDEN,
      );
      const mapped = BackendErrorMapper.map(error);
      expect(mapped).toBeInstanceOf(InvalidTokenError);
    });

    it('maps "Authentication failed." to InvalidCredentialsError', () => {
      const error = new BackendError(
        'Authentication failed.',
        BackendErrorLabel.INVALID_CREDENTIALS,
        StatusCode.FORBIDDEN,
      );
      const mapped = BackendErrorMapper.map(error);
      expect(mapped).toBeInstanceOf(InvalidCredentialsError);
    });

    it('maps "Token expired" to TokenExpiredError', () => {
      const error = new BackendError('Token expired', BackendErrorLabel.INVALID_CREDENTIALS, StatusCode.FORBIDDEN);
      const mapped = BackendErrorMapper.map(error);
      expect(mapped).toBeInstanceOf(TokenExpiredError);
    });

    it('maps "Missing cookie" to MissingCookieError', () => {
      const error = new BackendError('Missing cookie', BackendErrorLabel.INVALID_CREDENTIALS, StatusCode.FORBIDDEN);
      const mapped = BackendErrorMapper.map(error);
      expect(mapped).toBeInstanceOf(MissingCookieError);
    });

    it('maps invalid conversation UUID to ConversationIsUnknownError', () => {
      const error = new BackendError(
        "[path] 'cnv' invalid: Failed reading: Invalid UUID",
        BackendErrorLabel.CLIENT_ERROR,
        StatusCode.BAD_REQUEST,
      );
      const mapped = BackendErrorMapper.map(error);
      expect(mapped).toBeInstanceOf(ConversationIsUnknownError);
    });

    it('maps invalid user UUID to UserIsUnknownError', () => {
      const error = new BackendError(
        "[path] 'usr' invalid: Failed reading: Invalid UUID",
        BackendErrorLabel.CLIENT_ERROR,
        StatusCode.BAD_REQUEST,
      );
      const mapped = BackendErrorMapper.map(error);
      expect(mapped).toBeInstanceOf(UserIsUnknownError);
    });

    it('maps suspended account to SuspendedAccountError', () => {
      const error = new BackendError('Account suspended.', BackendErrorLabel.SUSPENDED_ACCOUNT, StatusCode.FORBIDDEN);
      const mapped = BackendErrorMapper.map(error);
      expect(mapped).toBeInstanceOf(SuspendedAccountError);
    });
  });

  describe('Fallback behavior', () => {
    it('returns original error when no mapping exists', () => {
      const error = new BackendError('unknown message', BackendErrorLabel.CLIENT_ERROR, StatusCode.BAD_REQUEST);
      const mapped = BackendErrorMapper.map(error);
      expect(mapped).toBe(error);
    });
  });
});
