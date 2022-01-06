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

import {BackendErrorLabel} from '@wireapp/api-client/src/http/';
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
      ACCESS_DENIED: BackendErrorLabel.ACCESS_DENIED,
      BAD_GATEWAY: BackendErrorLabel.BAD_GATEWAY,
      BAD_REQUEST: BackendErrorLabel.BAD_REQUEST,
      BLACKLISTED_EMAIL: BackendErrorLabel.BLACKLISTED_EMAIL,
      BLACKLISTED_PHONE: BackendErrorLabel.BLACKLISTED_PHONE,
      CLIENT_ERROR: BackendErrorLabel.CLIENT_ERROR,
      DOMAIN_BLOCKED_FOR_REGISTRATION: BackendErrorLabel.DOMAIN_BLOCKED_FOR_REGISTRATION,
      INVALID_CREDENTIALS: BackendErrorLabel.INVALID_CREDENTIALS,
      INVALID_EMAIL: BackendErrorLabel.INVALID_EMAIL,
      INVALID_INVITATION_CODE: BackendErrorLabel.INVALID_INVITATION_CODE,
      INVALID_PHONE: BackendErrorLabel.INVALID_PHONE,
      KEY_EXISTS: BackendErrorLabel.KEY_EXISTS,
      MISSING_AUTH: BackendErrorLabel.MISSING_AUTH,
      NOT_CONNECTED: BackendErrorLabel.NOT_CONNECTED,
      NOT_FOUND: BackendErrorLabel.NOT_FOUND,
      PASSWORD_EXISTS: BackendErrorLabel.PASSWORD_EXISTS,
      PENDING_ACTIVATION: BackendErrorLabel.PENDING_ACTIVATION,
      PENDING_LOGIN: BackendErrorLabel.PENDING_LOGIN,
      SERVER_ERROR: BackendErrorLabel.SERVER_ERROR,
      SERVICE_DISABLED: BackendErrorLabel.SERVICE_DISABLED,
      SUSPENDED: BackendErrorLabel.ACCOUNT_SUSPENDED,
      TOO_MANY_BOTS: BackendErrorLabel.TOO_MANY_SERVICES,
      TOO_MANY_CLIENTS: BackendErrorLabel.TOO_MANY_CLIENTS,
      TOO_MANY_MEMBERS: BackendErrorLabel.TOO_MANY_MEMBERS,
      UNAUTHORIZED: BackendErrorLabel.UNAUTHORIZED,
      UNKNOWN_CLIENT: BackendErrorLabel.UNKNOWN_CLIENT,
    };
  }

  static get TYPE() {
    return {
      GENERIC: 'GENERIC',
    };
  }
}
