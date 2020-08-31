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

import {BaseError} from './BaseError';

export class BackendClientError extends BaseError {
  code: number;
  label: string;

  constructor(params: {code: number; label?: string; message: string}) {
    super(BackendClientError.TYPE.GENERIC, params.message);
    this.code = params.code;
    this.label = params.label;
  }

  static get LABEL() {
    return {
      ACCESS_DENIED: 'access-denied',
      BAD_GATEWAY: 'bad-gateway',
      BAD_REQUEST: 'bad-request',
      BLACKLISTED_EMAIL: 'blacklisted-email',
      BLACKLISTED_PHONE: 'blacklisted-phone',
      CLIENT_ERROR: 'client-error',
      CONNECTIVITY_PROBLEM: 'connectivity-problem',
      INVALID_CREDENTIALS: 'invalid-credentials',
      INVALID_EMAIL: 'invalid-email',
      INVALID_INVITATION_CODE: 'invalid-invitation-code',
      INVALID_PHONE: 'invalid-phone',
      KEY_EXISTS: 'key-exists',
      MISSING_AUTH: 'missing-auth',
      MISSING_IDENTITY: 'missing-identity',
      NOT_CONNECTED: 'not-connected',
      NOT_FOUND: 'not-found',
      PASSWORD_EXISTS: 'password-exists',
      PENDING_ACTIVATION: 'pending-activation',
      PENDING_LOGIN: 'pending-login',
      PHONE_BUDGET_EXHAUSTED: 'phone-budget-exhausted',
      SERVER_ERROR: 'server-error',
      SERVICE_DISABLED: 'service-disabled',
      SUSPENDED: 'suspended',
      TOO_MANY_BOTS: 'too-many-bots',
      TOO_MANY_CLIENTS: 'too-many-clients',
      TOO_MANY_MEMBERS: 'too-many-members',
      UNAUTHORIZED: 'unauthorized',
      UNKNOWN_CLIENT: 'unknown-client',
    };
  }

  static get TYPE() {
    return {
      GENERIC: 'GENERIC',
    };
  }
}
