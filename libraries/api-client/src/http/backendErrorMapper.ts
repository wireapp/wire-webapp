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
    [BackendErrorLabel.CLIENT_ERROR]: error => new BackendError('Wrong set of parameters.', error.label, error.code),

    [BackendErrorLabel.INVALID_INVITATION_CODE]: error =>
      new InvalidInvitationCodeError('Invalid invitation code.', error.label, error.code),
    [BackendErrorLabel.MLS_INVALID_LEAF_NODE_SIGNATURE]: error =>
      new MLSInvalidLeafNodeSignatureError('Invalid leaf node signature', error.label, error.code),

    [BackendErrorLabel.MLS_INVALID_LEAF_NODE_INDEX]: error =>
      new MLSInvalidLeafNodeIndexError('Invalid leaf node index', error.label, error.code),
  },

  [StatusCode.FORBIDDEN]: {
    [BackendErrorLabel.INVALID_CREDENTIALS]: error =>
      // default to logout-safe type for unknown messages
      new InvalidTokenError('Authentication failed because the token is invalid.', error.label, error.code),

    [BackendErrorLabel.CLIENT_ERROR]: error => new BackendError('Operation not permitted.', error.label, error.code),

    [BackendErrorLabel.NOT_CONNECTED]: error =>
      new UnconnectedUserError('Users are not connected.', error.label, error.code),

    [BackendErrorLabel.INVALID_OPERATION]: error =>
      new ConversationOperationError('Cannot perform this operation.', error.label, error.code),

    [BackendErrorLabel.SUSPENDED_ACCOUNT]: error =>
      new SuspendedAccountError('Account suspended.', error.label, error.code),
  },

  [StatusCode.TOO_MANY_REQUESTS]: {
    [BackendErrorLabel.CLIENT_ERROR]: error =>
      new LoginTooFrequentError('Logins too frequent. User login temporarily disabled.', error.label, error.code),
  },

  [StatusCode.CONFLICT]: {
    [BackendErrorLabel.INVITE_EMAIL_EXISTS]: error =>
      new InviteEmailInUseError('The given e-mail address is in use.', error.label, error.code),

    [BackendErrorLabel.KEY_EXISTS]: error =>
      new IdentifierExistsError('The given e-mail address is in use.', error.label, error.code),
    [BackendErrorLabel.MLS_STALE_MESSAGE]: error =>
      new MLSStaleMessageError('The conversation epoch in a message is too old', error.label, error.code),
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
    [BackendErrorLabel.NOT_FOUND]: error => new ServiceNotFoundError('Service not found', error.label, error.code),
  },
};

/**
 * Message-specific variants for known texts under a given (code,label).
 * Provides finer granularity when wording matches; otherwise we fall back to defaultHandlers.
 */
const messageVariantHandlers: StatusCodeToMessageVariantMap = {
  [StatusCode.BAD_REQUEST]: {
    [BackendErrorLabel.CLIENT_ERROR]: {
      [MESSAGE_BAD_REQUEST_SATISFY]: error => new BackendError('Wrong set of parameters.', error.label, error.code),
      [MESSAGE_INVALID_CONVERSATION_UUID]: error =>
        new ConversationIsUnknownError('Conversation ID is unknown.', error.label, error.code),
      [MESSAGE_INVALID_USER_UUID]: error => new UserIsUnknownError('User ID is unknown.', error.label, error.code),
    },
  },
  [StatusCode.FORBIDDEN]: {
    [BackendErrorLabel.INVALID_CREDENTIALS]: {
      [MESSAGE_INVALID_ZAUTH_TOKEN]: error =>
        new InvalidTokenError('Authentication failed because the token is invalid.', error.label, error.code),
      [MESSAGE_INVALID_TOKEN]: error =>
        new InvalidTokenError('Authentication failed because the token is invalid.', error.label, error.code),
      [MESSAGE_AUTHENTICATION_FAILED]: error =>
        new InvalidCredentialsError('Authentication failed because of invalid credentials.', error.label, error.code),
      [MESSAGE_MISSING_COOKIE]: error =>
        new MissingCookieError('Authentication failed because the cookie is missing.', error.label, error.code),
      [MESSAGE_TOKEN_EXPIRED]: error =>
        new TokenExpiredError('Authentication failed because the token is expired.', error.label, error.code),
      [MESSAGE_MISSING_COOKIE_AND_TOKEN]: error =>
        new MissingCookieAndTokenError(
          'Authentication failed because both cookie and token are missing.',
          error.label,
          error.code,
        ),
    },
    [BackendErrorLabel.INVALID_OPERATION]: {
      [MESSAGE_INVALID_OPERATION_FOR_ONE_TO_ONE]: error =>
        new ConversationOperationError('Cannot leave 1:1 conversation.', error.label, error.code),
    },
    [BackendErrorLabel.CLIENT_ERROR]: {
      [MESSAGE_FAILED_READING_INVALID_ZAUTH_TOKEN]: error =>
        new InvalidTokenError('Authentication failed because the token is invalid.', error.label, error.code),
    },
  },
};

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
    const mapped = messageVariantHandler({...error, label});
    logger.info('Mapped backend error with message variant', {error, mapped});
    return mapped;
  }

  // 2) Default fallback for this (code,label)
  const fallbackHandler = defaultHandlers[code]?.[label];
  if (fallbackHandler) {
    const mapped = fallbackHandler({...error, label});
    logger.info('Mapped backend error with default handler', {error, mapped});
    return mapped;
  }

  // 3) Unknown (code,label) — keep original but log in dev
  logger.warn('Failed to map backend error; returning original', {error});
  return error;
}
