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

// BAD_REQUEST / CLIENT_ERROR
const MESSAGE_BAD_REQUEST_SATISFY = 'Error in $: Failed reading: satisfy';
const MESSAGE_INVALID_CONVERSATION_UUID = "[path] 'cnv' invalid: Failed reading: Invalid UUID";
const MESSAGE_INVALID_USER_UUID = "[path] 'usr' invalid: Failed reading: Invalid UUID";
// BAD_REQUEST / MLS
const MESSAGE_MLS_INVALID_LEAF_NODE_SIGNATURE = 'Invalid leaf node signature';
const MESSAGE_MLS_INVALID_LEAF_NODE_INDEX = 'Invalid leaf node index';
// FORBIDDEN / INVALID_CREDENTIALS and related variants
const MESSAGE_INVALID_ZAUTH_TOKEN = 'Invalid zauth token';
const MESSAGE_INVALID_TOKEN = 'Invalid token';
const MESSAGE_AUTHENTICATION_FAILED = 'Authentication failed.';
const MESSAGE_MISSING_COOKIE = 'Missing cookie';
const MESSAGE_TOKEN_EXPIRED = 'Token expired';
const MESSAGE_MISSING_COOKIE_AND_TOKEN = 'Missing cookie and token';
// FORBIDDEN / INVALID_OPERATION
const MESSAGE_INVALID_OPERATION_FOR_ONE_TO_ONE = 'invalid operation for 1:1 conversations';
// FORBIDDEN / CLIENT_ERROR variant
const MESSAGE_FAILED_READING_INVALID_ZAUTH_TOKEN = 'Failed reading: Invalid zauth token';

// Consolidated token-invalid messages to reduce duplication across variants.
const INVALID_TOKEN_MESSAGES = new Set<string>([
  MESSAGE_INVALID_ZAUTH_TOKEN,
  MESSAGE_INVALID_TOKEN,
  MESSAGE_FAILED_READING_INVALID_ZAUTH_TOKEN,
]);

/**
 * Baseline/default handler for each (code, label). Used when no message variant matches.
 */
const defaultHandlers: StatusCodeToLabelMap = {
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
      if (isMlsGroupOutOfSyncError(error)) {
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
const messageVariantHandlers: StatusCodeToMessageVariantMap = {
  [StatusCode.BAD_REQUEST]: {
    [BackendErrorLabel.CLIENT_ERROR]: {
      [MESSAGE_BAD_REQUEST_SATISFY]: e => new BackendError('Wrong set of parameters.', e.label, e.code),
      [MESSAGE_INVALID_CONVERSATION_UUID]: e =>
        new ConversationIsUnknownError('Conversation ID is unknown.', e.label, e.code),
      [MESSAGE_INVALID_USER_UUID]: e => new UserIsUnknownError('User ID is unknown.', e.label, e.code),
    },
    [BackendErrorLabel.MLS_INVALID_LEAF_NODE_SIGNATURE]: {
      [MESSAGE_MLS_INVALID_LEAF_NODE_SIGNATURE]: e =>
        new MLSInvalidLeafNodeSignatureError('Invalid leaf node signature', e.label, e.code),
    },
    [BackendErrorLabel.MLS_INVALID_LEAF_NODE_INDEX]: {
      [MESSAGE_MLS_INVALID_LEAF_NODE_INDEX]: e =>
        new MLSInvalidLeafNodeIndexError('Invalid leaf node index', e.label, e.code),
    },
  },
  [StatusCode.FORBIDDEN]: {
    [BackendErrorLabel.INVALID_CREDENTIALS]: {
      [MESSAGE_INVALID_ZAUTH_TOKEN]: e =>
        new InvalidTokenError('Authentication failed because the token is invalid.', e.label, e.code),
      [MESSAGE_INVALID_TOKEN]: e =>
        new InvalidTokenError('Authentication failed because the token is invalid.', e.label, e.code),
      [MESSAGE_AUTHENTICATION_FAILED]: e =>
        new InvalidCredentialsError('Authentication failed because of invalid credentials.', e.label, e.code),
      [MESSAGE_MISSING_COOKIE]: e =>
        new MissingCookieError('Authentication failed because the cookie is missing.', e.label, e.code),
      [MESSAGE_TOKEN_EXPIRED]: e =>
        new TokenExpiredError('Authentication failed because the token is expired.', e.label, e.code),
      [MESSAGE_MISSING_COOKIE_AND_TOKEN]: e =>
        new MissingCookieAndTokenError(
          'Authentication failed because both cookie and token are missing.',
          e.label,
          e.code,
        ),
    },
    [BackendErrorLabel.INVALID_OPERATION]: {
      [MESSAGE_INVALID_OPERATION_FOR_ONE_TO_ONE]: e =>
        new ConversationOperationError('Cannot leave 1:1 conversation.', e.label, e.code),
    },
    [BackendErrorLabel.CLIENT_ERROR]: {
      [MESSAGE_FAILED_READING_INVALID_ZAUTH_TOKEN]: e =>
        new InvalidTokenError('Authentication failed because the token is invalid.', e.label, e.code),
    },
  },
};

function logUnmapped(error: BackendError, reason: string) {
  if (process.env.NODE_ENV === 'development') {
    logger.warn('[BackendErrorMapper] Unmapped error:', {
      code: error.code,
      label: error.label,
      message: error.message,
      reason,
    });
  }
}

export function isMlsGroupOutOfSyncError(error: BackendError): error is MLSGroupOutOfSyncError {
  return (
    error.code === StatusCode.CONFLICT &&
    error.label === BackendErrorLabel.MLS_GROUP_OUT_OF_SYNC &&
    'missing_users' in error
  );
}

/**
 * Map a BackendError to a more specific error instance based on its code, label, and message.
 */
export function mapBackendError(error: BackendError): BackendError {
  const code = Number(error.code) as StatusCode;
  const label = error.label as BackendErrorLabel;
  const message = (error.message ?? '').trim();

  // Special-case: MLS group out of sync (structural field-based)
  if (isMlsGroupOutOfSyncError(error)) {
    return new MLSGroupOutOfSyncError(error.code, error.missing_users, error.message);
  }

  // Consolidated handling for common "invalid token" variants
  if (code === StatusCode.FORBIDDEN) {
    if (
      (label === BackendErrorLabel.INVALID_CREDENTIALS || label === BackendErrorLabel.CLIENT_ERROR) &&
      INVALID_TOKEN_MESSAGES.has(message)
    ) {
      return new InvalidTokenError('Authentication failed because the token is invalid.', label, code);
    }
  }

  // 1) Message-specific variant
  const messageVariantHandler = messageVariantHandlers[code]?.[label]?.[message];
  if (messageVariantHandler) {
    return messageVariantHandler({...error, label} as BackendErrorWithLabel);
  }

  // 2) Default fallback for this (code,label)
  const fallbackHandler = defaultHandlers[code]?.[label];
  if (fallbackHandler) {
    return fallbackHandler({...error, label} as BackendErrorWithLabel);
  }

  // 3) Unknown (code,label) — keep original but log in dev
  logUnmapped(error, 'No mapping for code+label (+message)');
  return error;
}
