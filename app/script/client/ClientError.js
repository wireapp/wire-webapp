/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.client = z.client || {};

z.client.ClientError = class ClientError extends Error {
  constructor(type) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || z.client.ClientError.TYPE.UNKNOWN;

    switch (this.type) {
      case z.client.ClientError.TYPE.CLIENT_NOT_SET:
        this.message = 'Local client is not yet set';
        break;
      case z.client.ClientError.TYPE.DATABASE_FAILURE:
        this.message = 'Client related database transaction failed';
        break;
      case z.client.ClientError.TYPE.NO_CLIENT_ID:
        this.message = 'Client ID is not defined';
        break;
      case z.client.ClientError.TYPE.NO_USER_ID:
        this.message = 'User ID is not defined';
        break;
      case z.client.ClientError.TYPE.NO_VALID_CLIENT:
        this.message = 'No valid local client found';
        break;
      case z.client.ClientError.TYPE.REQUEST_FAILURE:
        this.message = 'Client related backend request failed';
        break;
      case z.client.ClientError.TYPE.REQUEST_FORBIDDEN:
        this.message = 'Client related backend request forbidden';
        break;
      case z.client.ClientError.TYPE.TOO_MANY_CLIENTS:
        this.message = 'User has reached the maximum of allowed clients';
        break;
      default:
        this.message = 'Unknown ClientError';
    }
  }

  static get TYPE() {
    return {
      CLIENT_NOT_SET: 'z.client.ClientError.TYPE.CLIENT_NOT_SET',
      DATABASE_FAILURE: 'z.client.ClientError.TYPE.DATABASE_FAILURE',
      NO_CLIENT_ID: 'z.client.ClientError.TYPE.NO_CLIENT_ID',
      NO_USER_ID: 'z.client.ClientError.TYPE.NO_USER_ID',
      NO_VALID_CLIENT: 'z.client.ClientError.TYPE.NO_VALID_CLIENT',
      REQUEST_FAILURE: 'z.client.ClientError.TYPE.REQUEST_FAILURE',
      REQUEST_FORBIDDEN: 'z.client.ClientError.TYPE.REQUEST_FORBIDDEN',
      TOO_MANY_CLIENTS: 'z.client.ClientError.TYPE.TOO_MANY_CLIENTS',
      UNKNOWN: 'z.client.ClientError.TYPE.UNKNOWN',
    };
  }
};
