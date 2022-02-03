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

export class BackendError extends Error {
  public code: number;
  public label: string;

  constructor(params: {code: number; label?: string; message?: string}) {
    super();
    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.code = params.code;
    this.label = params.label;
    this.message = params.message;
  }

  static AUTH_ERRORS = {
    BLACKLISTED_EMAIL: 'blacklisted-email',
    BLACKLISTED_PHONE: 'blacklisted-phone',
    INVALID_CODE: 'invalid-code',
    INVALID_CREDENTIALS: 'invalid-credentials',
    INVALID_EMAIL: 'invalid-email',
    INVALID_INVITATION_CODE: 'invalid-invitation-code',
    INVALID_PHONE: 'invalid-phone',
    KEY_EXISTS: 'key-exists',
    MISSING_AUTH: 'missing-auth',
    PASSWORD_EXISTS: 'password-exists',
    PENDING_ACTIVATION: 'pending-activation',
    PENDING_LOGIN: 'pending-login',
    SUSPENDED: 'suspended',
    TOO_MANY_LOGINS: 'client-error',
  };

  static CLIENT_ERRORS = {
    TOO_MANY_CLIENTS: 'too-many-clients',
  };

  static CONVERSATION_ERRORS = {
    CONVERSATION_CODE_NOT_FOUND: 'no-conversation-code',
    CONVERSATION_NOT_FOUND: 'no-conversation',
    CONVERSATION_TOO_MANY_MEMBERS: 'too-many-members',
  };

  static GENERAL_ERRORS = {
    ACCESS_DENIED: 'access-denied',
    BAD_REQUEST: 'bad-request',
    INVALID_OPERATION: 'invalid-op',
    INVALID_PAYLOAD: 'invalid-payload',
    NOT_FOUND: 'not-found',
    OPERATION_DENIED: 'operation-denied',
    UNAUTHORIZED: 'unauthorized',
  };

  static HANDLE_ERRORS = {
    HANDLE_EXISTS: 'handle-exists',
    HANDLE_TOO_SHORT: 'handle-too-short', // Synthetic error label
    INVALID_HANDLE: 'invalid-handle',
  };

  static TEAM_ERRORS = {
    NO_OTHER_OWNER: 'no-other-owner',
    NO_TEAM: 'no-team',
    NO_TEAM_MEMBER: 'no-team-member',
    TOO_MANY_MEMBERS: 'too-many-team-members',
  };

  static TEAM_INVITE_ERRORS = {
    ALREADY_INVITED: 'already-invited', // Synthetic error label
    EMAIL_EXISTS: 'email-exists',
  };

  static PAYMENT_ERRORS = {
    EXPIRED_CARD: 'expired_card',
  };

  static SSO_ERRORS = {
    SSO_FORBIDDEN: 'forbidden',
    SSO_GENERIC_ERROR: 'generic-sso-error', // Synthetic error label
    SSO_INSUFFICIENT_PERMISSIONS: 'insufficient-permissions',
    SSO_INVALID_FAILURE_REDIRECT: 'bad-failure-redirect',
    SSO_INVALID_SUCCESS_REDIRECT: 'bad-success-redirect',
    SSO_INVALID_UPSTREAM: 'bad-upstream',
    SSO_INVALID_USERNAME: 'bad-username',
    SSO_NOT_FOUND: 'not-found',
    SSO_NO_MATCHING_AUTH: 'no-matching-auth-req',
    SSO_SERVER_ERROR: 'server-error',
    SSO_UNSUPPORTED_SAML: 'server-error-unsupported-saml',
    SSO_USER_CANCELLED_ERROR: 'user-cancelled-sso-error', // Synthetic error label
  };

  static LABEL = {
    ...BackendError.AUTH_ERRORS,
    ...BackendError.CONVERSATION_ERRORS,
    ...BackendError.GENERAL_ERRORS,
    ...BackendError.CLIENT_ERRORS,
    ...BackendError.HANDLE_ERRORS,
    ...BackendError.TEAM_ERRORS,
    ...BackendError.TEAM_INVITE_ERRORS,
    ...BackendError.PAYMENT_ERRORS,
    ...BackendError.SSO_ERRORS,
  };
}
