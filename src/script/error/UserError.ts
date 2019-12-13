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

export enum UserErrorType {
  INVALID_UPDATE = 'INVALID_UPDATE',
  PRE_KEY_NOT_FOUND = 'PRE_KEY_NOT_FOUND',
  REQUEST_FAILURE = 'REQUEST_FAILURE',
  USERNAME_TAKEN = 'USERNAME_TAKEN',
  USER_MISSING_EMAIL = 'USER_MISSING_EMAIL',
  USER_NOT_FOUND = 'USER_NOT_FOUND',
}

export class UserError extends Error {
  static readonly TYPE = UserErrorType;
  static readonly MESSAGE: Record<UserErrorType, string> = {
    INVALID_UPDATE: 'False input data for requested update',
    PRE_KEY_NOT_FOUND: 'Pre-key not found',
    REQUEST_FAILURE: 'User related backend request failure',
    USERNAME_TAKEN: 'Username is already taken',
    USER_MISSING_EMAIL: 'Self user has not set email address',
    USER_NOT_FOUND: 'User not found',
  };
  readonly type: UserErrorType;

  constructor(type: UserErrorType, message?: string) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type;
    this.message = message || UserError.MESSAGE[type];
  }
}
