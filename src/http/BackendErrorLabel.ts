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
  BINDING_EXISTS = 'binding-exists',
  BINDING_TEAM = 'binding-team',
  BLACKLISTED_EMAIL = 'blacklisted-email',
  BLACKLISTED_PHONE = 'blacklisted-phone',
  CLIENT_ERROR = 'client-error',
  CUSTOM_BACKEND_NOT_FOUND = 'custom-backend-not-found',
  EXPIRED_CARD = 'expired_card',
  HANDLE_EXISTS = 'handle-exists',
  INSUFFICIENT_PERMISSIONS = 'insufficient-permissions',
  INTERNAL_ERROR = 'internal-error',
  INVALID_CODE = 'invalid-code',
  INVALID_CREDENTIALS = 'invalid-credentials',
  INVALID_EMAIL = 'invalid-email',
  INVALID_HANDLE = 'invalid-handle',
  INVALID_INVITATION_CODE = 'invalid-invitation-code',
  INVALID_OPERATION = 'invalid-op',
  INVALID_PAYLOAD = 'invalid-payload',
  INVALID_PERMISSIONS = 'invalid-permissions',
  INVALID_PHONE = 'invalid-phone',
  INVALID_TEAM_STATUS_UPDATE = 'invalid-team-status-update',
  INVITE_EMAIL_EXISTS = 'email-exists',
  KEY_EXISTS = 'key-exists',
  MISSING_AUTH = 'missing-auth',
  NON_BINDING_TEAM = 'non-binding-team',
  NON_BINDING_TEAM_MEMBERS = 'non-binding-team-members',
  NOT_CONNECTED = 'not-connected',
  NOT_FOUND = 'not-found',
  NO_ADD_TO_MANAGED = 'no-add-to-managed',
  NO_CONVERSATION = 'no-conversation',
  NO_CONVERSATION_CODE = 'no-conversation-code',
  NO_MANAGED_CONVERSATION = 'no-managed-team-conv',
  NO_OTHER_OWNER = 'no-other-owner',
  NO_SELF_DELETE_FOR_TEAM_OWNER = 'no-self-delete-for-team-owner',
  NO_TEAM = 'no-team',
  NO_TEAM_MEMBER = 'no-team-member',
  OPERATION_DENIED = 'operation-denied',
  PASSWORD_EXISTS = 'password-exists',
  PENDING_ACTIVATION = 'pending-activation',
  PENDING_LOGIN = 'pending-login',
  QUEUE_FULL = 'queue-full',
  SUSPENDED_ACCOUNT = 'suspended',
  TOO_MANY_CLIENTS = 'too-many-clients',
  TOO_MANY_MEMBERS = 'too-many-members',
  TOO_MANY_TEAM_MEMBERS = 'too-many-team-members',
  UNAUTHORIZED = 'unauthorized',
  UNKNOWN_CLIENT = 'unknown-client',
}

export enum SyntheticErrorLabel {
  ALREADY_INVITED = 'already-invited',
  FORBIDDEN_PHONE_NUMBER = 'forbidden-phone-number',
  HANDLE_TOO_SHORT = 'handle-too-short',
  INVALID_PHONE_NUMBER = 'invalid-phone-number',
  REQUEST_CANCELLED = 'request-cancelled',
  SERVICE_NOT_FOUND = 'service-not-found',
  SSO_GENERIC_ERROR = 'generic-sso-error',
  SSO_NO_SSO_CODE = 'no-sso-code-found',
  SSO_USER_CANCELLED_ERROR = 'user-cancelled-sso-error',
  UNKNOWN = 'unknown-error',
}
