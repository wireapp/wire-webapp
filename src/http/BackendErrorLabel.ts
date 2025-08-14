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
  BAD_GATEWAY = 'bad-gateway',
  CLIENT_ERROR = 'client-error',
  SERVER_ERROR = 'server-error',
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
  DOMAIN_BLOCKED_FOR_REGISTRATION = 'domain-blocked-for-registration',
  INVALID_CODE = 'invalid-code',
  INVALID_CREDENTIALS = 'invalid-credentials',
  INVALID_EMAIL = 'invalid-email',
  INVALID_INVITATION_CODE = 'invalid-invitation-code',
  KEY_EXISTS = 'key-exists',
  MISSING_AUTH = 'missing-auth',
  PASSWORD_EXISTS = 'password-exists',
  PENDING_ACTIVATION = 'pending-activation',
  PENDING_LOGIN = 'pending-login',
  SUSPENDED_ACCOUNT = 'suspended',
  CODE_AUTHENTICATION_REQUIRED = 'code-authentication-required',
  CODE_AUTHENTICATION_FAILED = 'code-authentication-failed',
  PASSWORD_AUTHENTICATION_FAILED = 'password-authentication-failed',

  // Client errors
  TOO_MANY_CLIENTS = 'too-many-clients',
  UNKNOWN_CLIENT = 'unknown-client',
  CLIENT_CAPABILITY_REMOVED = 'client-feature-cannot-be-removed',

  // Conversation errors
  TOO_MANY_MEMBERS = 'too-many-members',
  NO_CONVERSATION = 'no-conversation',
  NO_CONVERSATION_CODE = 'no-conversation-code',
  NOT_CONNECTED = 'not-connected',
  INVALID_CONVERSATION_PASSWORD = 'invalid-conversation-password',
  MLS_STALE_MESSAGE = 'mls-stale-message',
  MLS_INVALID_LEAF_NODE_SIGNATURE = 'mls-invalid-leaf-node-signature',
  MLS_INVALID_LEAF_NODE_INDEX = 'mls-invalid-leaf-node-index',

  // Handle errors
  HANDLE_EXISTS = 'handle-exists',
  INVALID_HANDLE = 'invalid-handle',

  // Team errors
  /** @deprecated */
  NO_OTHER_OWNER = 'no-other-owner',
  /** This error is thrown when an owner tries to delete themself */
  NO_SELF_DELETE_FOR_TEAM_OWNER = 'no-self-delete-for-team-owner',
  CANNOT_DELETE_OWN_IDP = 'cannot-delete-own-idp',
  IDP_ISSUER_IN_USE = 'idp-issuer-in-use',
  NO_TEAM = 'no-team',
  NO_TEAM_MEMBER = 'no-team-member',
  TOO_MANY_TEAM_MEMBERS = 'too-many-team-members',
  INVITE_EMAIL_EXISTS = 'email-exists',
  /** @deprecated */
  BINDING_EXISTS = 'binding-exists',
  /** @deprecated */
  BINDING_TEAM = 'binding-team',
  /** @deprecated */
  NON_BINDING_TEAM = 'non-binding-team',
  /** @deprecated */
  NON_BINDING_TEAM_MEMBERS = 'non-binding-team-members',
  INVALID_TEAM_STATUS_UPDATE = 'invalid-team-status-update',
  NO_MANAGED_CONVERSATION = 'no-managed-team-conv',
  NO_ADD_TO_MANAGED = 'no-add-to-managed',
  ACCOUNT_SUSPENDED = 'suspended',

  // Feature errors
  FEATURE_LOCKED = 'feature-locked',
  APP_LOCK_INVALID_TIMEOUT = 'inactivity-timeout-too-low',

  // Payment errors
  EXPIRED_CARD = 'expired_card',

  // Domain errors
  CUSTOM_BACKEND_NOT_FOUND = 'custom-backend-not-found',

  // Legalhold errors
  LEGAL_HOLD_MISSING_CONSENT = 'missing-legalhold-consent',
  LEGAL_HOLD_SERVICE_UNAVAILABLE = 'legalhold-unavailable',

  // Service errors
  SERVICE_DISABLED = 'service-disabled',
  TOO_MANY_SERVICES = 'too-many-bots',

  // Federation errors
  FEDERATION_NOT_ALLOWED = 'federation-denied',
  FEDERATION_NOT_AVAILABLE = 'federation-not-available',
  FEDERATION_BACKEND_NOT_FOUND = 'srv-record-not-found',
  FEDERATION_REMOTE_ERROR = 'federation-remote-error',
  FEDERATION_TLS_ERROR = 'federation-tls-error',

  // SSO errors
  SSO_FORBIDDEN = 'forbidden',
  SSO_INVALID_FAILURE_REDIRECT = 'bad-failure-redirect',
  SSO_INVALID_SUCCESS_REDIRECT = 'bad-success-redirect',
  SSO_INVALID_UPSTREAM = 'bad-upstream',
  SSO_INVALID_USERNAME = 'bad-username',
  SSO_NO_MATCHING_AUTH = 'no-matching-auth-req',
  SSO_UNSUPPORTED_SAML = 'server-error-unsupported-saml',
}

export enum SyntheticErrorLabel {
  ALREADY_INVITED = 'already-invited',
  HANDLE_TOO_SHORT = 'handle-too-short',
  REQUEST_CANCELLED = 'request-cancelled',
  SERVICE_NOT_FOUND = 'service-not-found',
  SSO_GENERIC_ERROR = 'generic-sso-error',
  SSO_NO_SSO_CODE = 'no-sso-code-found',
  SSO_USER_CANCELLED_ERROR = 'user-cancelled-sso-error',
  INVITATION_NOT_FOUND = 'invitation-not-found',
  INVITATION_MULTIPLE_FOUND = 'invitation-multiple-found',
  UNKNOWN = 'unknown-error',
  TOO_MANY_REQUESTS = 'too-many-requests',
  EMAIL_REQUIRED = 'email-required',
  INVALID_URL_FORMAT = 'invalid-url-format',
}
