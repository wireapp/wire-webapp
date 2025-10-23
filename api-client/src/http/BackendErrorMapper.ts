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

import {StatusCodes as StatusCode} from 'http-status-codes';

import {LogFactory} from '@wireapp/commons';

import {
  IdentifierExistsError,
  InvalidCredentialsError,
  LoginTooFrequentError,
  SuspendedAccountError,
  InvalidTokenError,
  MissingCookieAndTokenError,
  MissingCookieError,
  TokenExpiredError,
} from '../auth/';
import {
  ConversationIsUnknownError,
  ConversationOperationError,
  MLSGroupOutOfSyncError,
  MLSInvalidLeafNodeIndexError,
  MLSInvalidLeafNodeSignatureError,
  MLSStaleMessageError,
} from '../conversation/';
import {InvalidInvitationCodeError, InviteEmailInUseError, ServiceNotFoundError} from '../team/';
import {UnconnectedUserError, UserIsUnknownError} from '../user/';

import {BackendError, BackendErrorLabel} from './';

type BackendErrorWithLabel = BackendError & {label: BackendErrorLabel};
type ErrorBuilder = (e: BackendErrorWithLabel) => BackendError;

// A mapper builds the appropriate error instance from the backend error payload.
type ErrorLabelToBuilderMap = Partial<Record<BackendErrorLabel, ErrorBuilder>>;

type StatusCodeToLabelMap = Partial<Record<StatusCode, ErrorLabelToBuilderMap>>;
type MessageToBuilderMap = Record<string, ErrorBuilder>;
type StatusCodeToMessageVariantMap = Partial<
  Record<StatusCode, Partial<Record<BackendErrorLabel, MessageToBuilderMap>>>
>;

const logger = LogFactory.getLogger('@wireapp/api-client/http/BackendErrorMapper');

export class BackendErrorMapper {
  /**
   * Baseline/default handler for each (code, label). Used when no message variant matches.
   */
  public static defaultHandlers: StatusCodeToLabelMap = {
    [StatusCode.BAD_REQUEST]: {
      [BackendErrorLabel.CLIENT_ERROR]: e => new BackendError('Wrong set of parameters.', e.label, e.code),

      [BackendErrorLabel.INVALID_INVITATION_CODE]: e =>
        new InvalidInvitationCodeError('Invalid invitation code.', e.label, e.code),
    },

    [StatusCode.FORBIDDEN]: {
      [BackendErrorLabel.INVALID_CREDENTIALS]: e =>
        // default to logout-safe type for unknown messages
        new InvalidTokenError('Authentication failed because the token is invalid.', e.label, e.code),

      [BackendErrorLabel.CLIENT_ERROR]: e => new BackendError('Operation not permitted.', e.label, e.code),

      [BackendErrorLabel.NOT_CONNECTED]: e => new UnconnectedUserError('Users are not connected.', e.label, e.code),

      [BackendErrorLabel.INVALID_OPERATION]: e =>
        new ConversationOperationError('Cannot perform this operation.', e.label, e.code),

      [BackendErrorLabel.SUSPENDED_ACCOUNT]: e => new SuspendedAccountError('Account suspended.', e.label, e.code),
    },

    [StatusCode.TOO_MANY_REQUESTS]: {
      [BackendErrorLabel.CLIENT_ERROR]: e =>
        new LoginTooFrequentError('Logins too frequent. User login temporarily disabled.', e.label, e.code),
    },

    [StatusCode.CONFLICT]: {
      [BackendErrorLabel.INVITE_EMAIL_EXISTS]: e =>
        new InviteEmailInUseError('The given e-mail address is in use.', e.label, e.code),

      [BackendErrorLabel.KEY_EXISTS]: e =>
        new IdentifierExistsError('The given e-mail address is in use.', e.label, e.code),
      [BackendErrorLabel.MLS_STALE_MESSAGE]: e =>
        new MLSStaleMessageError('The conversation epoch in a message is too old', e.label, e.code),
      [BackendErrorLabel.MLS_GROUP_OUT_OF_SYNC]: error => {
        if (BackendErrorMapper.isMlsGroupOutOfSyncError(error)) {
          return new MLSGroupOutOfSyncError(error.code, error.missing_users, error.message);
        }

        logger.warn(
          'Failed to detect missing_users field in MLSGroupOutOfSyncError, using empty array for missing_users',
          {error},
        );
        return new MLSGroupOutOfSyncError(error.code, [], error.message);
      },
    },
    [StatusCode.NOT_FOUND]: {
      [BackendErrorLabel.NOT_FOUND]: e => new ServiceNotFoundError('Service not found', e.label, e.code),
    },
  };

  /**
   * Message-specific variants for known texts under a given (code,label).
   * Provides finer granularity when wording matches; otherwise we fall back to defaultHandlers.
   */
  private static messageVariantHandlers: StatusCodeToMessageVariantMap = {
    [StatusCode.BAD_REQUEST]: {
      [BackendErrorLabel.CLIENT_ERROR]: {
        'Error in $: Failed reading: satisfy': e => new BackendError('Wrong set of parameters.', e.label, e.code),
        "[path] 'cnv' invalid: Failed reading: Invalid UUID": e =>
          new ConversationIsUnknownError('Conversation ID is unknown.', e.label, e.code),
        "[path] 'usr' invalid: Failed reading: Invalid UUID": e =>
          new UserIsUnknownError('User ID is unknown.', e.label, e.code),
      },
      [BackendErrorLabel.MLS_INVALID_LEAF_NODE_SIGNATURE]: {
        'Invalid leaf node signature': e =>
          new MLSInvalidLeafNodeSignatureError('Invalid leaf node signature', e.label, e.code),
      },
      [BackendErrorLabel.MLS_INVALID_LEAF_NODE_INDEX]: {
        'Invalid leaf node index': e => new MLSInvalidLeafNodeIndexError('Invalid leaf node index', e.label, e.code),
      },
    },
    [StatusCode.FORBIDDEN]: {
      [BackendErrorLabel.INVALID_CREDENTIALS]: {
        'Invalid zauth token': e =>
          new InvalidTokenError('Authentication failed because the token is invalid.', e.label, e.code),
        'Invalid token': e =>
          new InvalidTokenError('Authentication failed because the token is invalid.', e.label, e.code),
        'Authentication failed.': e =>
          new InvalidCredentialsError('Authentication failed because of invalid credentials.', e.label, e.code),
        'Missing cookie': e =>
          new MissingCookieError('Authentication failed because the cookie is missing.', e.label, e.code),
        'Token expired': e =>
          new TokenExpiredError('Authentication failed because the token is expired.', e.label, e.code),
        'Missing cookie and token': e =>
          new MissingCookieAndTokenError(
            'Authentication failed because both cookie and token are missing.',
            e.label,
            e.code,
          ),
      },
      [BackendErrorLabel.INVALID_OPERATION]: {
        'invalid operation for 1:1 conversations': e =>
          new ConversationOperationError('Cannot leave 1:1 conversation.', e.label, e.code),
      },
      [BackendErrorLabel.CLIENT_ERROR]: {
        'Failed reading: Invalid zauth token': e =>
          new InvalidTokenError('Authentication failed because the token is invalid.', e.label, e.code),
      },
    },
  };

  private static logUnmapped(error: BackendError, reason: string) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[BackendErrorMapper] Unmapped error:', {
        code: error.code,
        label: error.label,
        message: error.message,
        reason,
      });
    }
  }

  public static isMlsGroupOutOfSyncError(error: BackendError): error is MLSGroupOutOfSyncError {
    return (
      error.code === StatusCode.CONFLICT &&
      error.label === BackendErrorLabel.MLS_GROUP_OUT_OF_SYNC &&
      'missing_users' in error
    );
  }

  public static map(error: BackendError): BackendError {
    const code = Number(error.code) as StatusCode;
    const label = error.label as BackendErrorLabel;
    const message = error.message ?? '';

    if (BackendErrorMapper.isMlsGroupOutOfSyncError(error)) {
      return new MLSGroupOutOfSyncError(error.code, error.missing_users, error.message);
    }

    // 1) Message-specific variant
    const messageVariantHandler = BackendErrorMapper.messageVariantHandlers[code]?.[label]?.[message];
    if (messageVariantHandler) {
      return messageVariantHandler(error as BackendErrorWithLabel);
    }

    // 2) Default fallback for this (code,label)
    const fallbackHandler = BackendErrorMapper.defaultHandlers[code]?.[label];
    if (fallbackHandler) {
      return fallbackHandler(error as BackendErrorWithLabel);
    }

    // 3) Unknown (code,label) — keep original but log in dev
    this.logUnmapped(error, 'No mapping for code+label (+message)');
    return error;
  }
}
