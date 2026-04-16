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

import {BackendError, BackendErrorLabel, StatusCode, SyntheticErrorLabel} from '../http/';

export class AuthenticationError extends BackendError {
  constructor(message: string, label: BackendErrorLabel | SyntheticErrorLabel, code: StatusCode) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'AuthenticationError';
  }
}

export class LoginTooFrequentError extends AuthenticationError {
  constructor(message: string, label = BackendErrorLabel.CLIENT_ERROR, code = StatusCode.TOO_MANY_REQUESTS) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'LoginTooFrequentError';
  }
}

export class InvalidCredentialsError extends AuthenticationError {
  constructor(message: string, label = BackendErrorLabel.INVALID_CREDENTIALS, code = StatusCode.FORBIDDEN) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'InvalidCredentialsError';
  }
}

export class SuspendedAccountError extends AuthenticationError {
  constructor(message: string, label = BackendErrorLabel.SUSPENDED_ACCOUNT, code = StatusCode.FORBIDDEN) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'SuspendedAccountError';
  }
}

export class IdentifierExistsError extends AuthenticationError {
  constructor(message: string, label = BackendErrorLabel.KEY_EXISTS, code = StatusCode.CONFLICT) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'IdentifierExistsError';
  }
}

export class TokenExpiredError extends AuthenticationError {
  constructor(message: string, label = BackendErrorLabel.INVALID_CREDENTIALS, code = StatusCode.FORBIDDEN) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'TokenExpiredError';
  }
}

export class InvalidTokenError extends AuthenticationError {
  constructor(message: string, label = BackendErrorLabel.INVALID_CREDENTIALS, code = StatusCode.FORBIDDEN) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'InvalidTokenError';
  }
}

export class MissingCookieError extends AuthenticationError {
  constructor(message: string, label = BackendErrorLabel.INVALID_CREDENTIALS, code = StatusCode.FORBIDDEN) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'MissingCookieError';
  }
}

export class PasswordExistsError extends AuthenticationError {
  constructor(message: string, label = BackendErrorLabel.PASSWORD_EXISTS, code = StatusCode.UNAUTHORIZED) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'PasswordExistsError';
  }
}

export class MissingCookieAndTokenError extends AuthenticationError {
  constructor(message: string, label = BackendErrorLabel.INVALID_CREDENTIALS, code = StatusCode.FORBIDDEN) {
    super(message, label, code);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = 'MissingCookieAndTokenError';
  }
}
