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

/**
 * @note Backend error labels are defined by the backend team and their source code.
 * @see https://github.com/wireapp/wire-server/blob/master/services/galley/src/Galley/API/Error.hs
 */
export enum BackendErrorLabel {
  ACCESS_DENIED = 'access-denied',
  BAD_REQUEST = 'bad-request',
  CLIENT_ERROR = 'client-error',
  INSUFFICIENT_PERMISSIONS = 'insufficient-permissions',
  INTERNAL_ERROR = 'internal-error',
  INVALID_OPERATION = 'invalid-op',
  INVALID_PAYLOAD = 'invalid-payload',
  INVALID_PERMISSIONS = 'invalid-permissions',
  NOT_FOUND = 'not-found',
  OPERATION_DENIED = 'operation-denied',
  QUEUE_FULL = 'queue-full',
  UNAUTHORIZED = 'unauthorized',
  // Authentication errors
  BLACKLISTED_EMAIL = 'blacklisted-email',
  BLACKLISTED_PHONE = 'blacklisted-phone',
  INVALID_CODE = 'invalid-code',
  INVALID_CREDENTIALS = 'invalid-credentials',
  INVALID_EMAIL = 'invalid-email',
  INVALID_INVITATION_CODE = 'invalid-invitation-code',
  INVALID_PHONE = 'invalid-phone',
  KEY_EXISTS = 'key-exists',
  MISSING_AUTH = 'missing-auth',
  PASSWORD_EXISTS = 'password-exists',
  PENDING_ACTIVATION = 'pending-activation',
  PENDING_LOGIN = 'pending-login',
  SUSPENDED_ACCOUNT = 'suspended',
  // Client errors
  TOO_MANY_CLIENTS = 'too-many-clients',
  UNKNOWN_CLIENT = 'unknown-client',
  // Conversation errors
  TOO_MANY_MEMBERS = 'too-many-members',
  NO_CONVERSATION = 'no-conversation',
  NO_CONVERSATION_CODE = 'no-conversation-code',
  NOT_CONNECTED = 'not-connected',
  // Handle errors
  HANDLE_EXISTS = 'handle-exists',
  INVALID_HANDLE = 'invalid-handle',
  // Team errors
  NO_OTHER_OWNER = 'no-other-owner',
  NO_TEAM = 'no-team',
  NO_TEAM_MEMBER = 'no-team-member',
  TOO_MANY_TEAM_MEMBERS = 'too-many-team-members',
  INVITE_EMAIL_EXISTS = 'email-exists',
  BINDING_EXISTS = 'binding-exists',
  BINDING_TEAM = 'binding-team',
  NON_BINDING_TEAM = 'non-binding-team',
  NON_BINDING_TEAM_MEMBERS = 'non-binding-team-members',
  INVALID_TEAM_STATUS_UPDATE = 'invalid-team-status-update',
  NO_MANAGED_CONVERSATION = 'no-managed-team-conv',
  NO_ADD_TO_MANAGED = 'no-add-to-managed',
  // Payment errors
  EXPIRED_CARD = 'expired_card',
  // Domain errors
  CUSTOM_BACKEND_NOT_FOUND = 'custom-backend-not-found',
}

export enum SyntheticErrorLabel {
  ALREADY_INVITED = 'already-invited',
  FORBIDDEN_PHONE_NUMBER = 'forbidden-phone-number',
  HANDLE_TOO_SHORT = 'handle-too-short',
  INVALID_PHONE_NUMBER = 'invalid-phone-number',
  SERVICE_NOT_FOUND = 'service-not-found',
  SSO_GENERIC_ERROR = 'generic-sso-error',
  SSO_NO_SSO_CODE = 'no-sso-code-found',
  SSO_USER_CANCELLED_ERROR = 'user-cancelled-sso-error',
  UNKNOWN = 'unknown-error',
}
