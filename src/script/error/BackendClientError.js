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

import {isObject} from 'underscore';

import {BaseError} from './BaseError';

export class BackendClientError extends BaseError {
  constructor(params) {
    const message = params.message || `${params}`;

    super('BackendClientError', BackendClientError.TYPE.GENERIC, message);

    if (isObject(params)) {
      this.code = params.code;
      this.label = params.label;
    } else if (typeof params === 'number') {
      this.code = params;
    }
  }

  static get LABEL() {
    return {
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

  static get STATUS_CODE() {
    return {
      ACCEPTED: 202,
      BAD_GATEWAY: 502,
      BAD_REQUEST: 400,
      CONFLICT: 409,
      CONNECTIVITY_PROBLEM: 0,
      CREATED: 201,
      FORBIDDEN: 403,
      INTERNAL_SERVER_ERROR: 500,
      NOT_FOUND: 404,
      NO_CONTENT: 204,
      OK: 200,
      PRECONDITION_FAILED: 412,
      REQUEST_TIMEOUT: 408,
      REQUEST_TOO_LARGE: 413,
      TOO_MANY_REQUESTS: 429,
      UNAUTHORIZED: 401,
    };
  }

  static get TYPE() {
    return {
      GENERIC: 'GENERIC',
    };
  }
}

window.z = window.z || {};
window.z.error = z.error || {};
z.error.BackendClientError = BackendClientError;
