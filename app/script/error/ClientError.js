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

window.z = window.z || {};
window.z.error = z.error || {};

z.error.ClientError = class ClientError extends z.error.BaseError {
  constructor(type, message) {
    super('ClientError', type, message);
  }

  static get MESSAGE() {
    return {
      CLIENT_NOT_SET: 'Local client is not yet set',
      DATABASE_FAILURE: 'Client related database transaction failed',
      NO_CLIENT_ID: 'Client ID is not defined',
      NO_USER_ID: 'User ID is not defined',
      NO_VALID_CLIENT: 'No valid local client found',
      REQUEST_FAILURE: 'Client related backend request failed',
      REQUEST_FORBIDDEN: 'Client related backend request forbidden',
      TOO_MANY_CLIENTS: 'User has reached the maximum of allowed clients',
    };
  }

  static get TYPE() {
    return {
      CLIENT_NOT_SET: 'CLIENT_NOT_SET',
      DATABASE_FAILURE: 'DATABASE_FAILURE',
      NO_CLIENT_ID: 'NO_CLIENT_ID',
      NO_USER_ID: 'NO_USER_ID',
      NO_VALID_CLIENT: 'NO_VALID_CLIENT',
      REQUEST_FAILURE: 'REQUEST_FAILURE',
      REQUEST_FORBIDDEN: 'REQUEST_FORBIDDEN',
      TOO_MANY_CLIENTS: 'TOO_MANY_CLIENTS',
    };
  }
};
