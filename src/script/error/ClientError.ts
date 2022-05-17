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

import {BaseError, BASE_ERROR_TYPE} from './BaseError';

export enum CLIENT_ERROR_TYPE {
  CLIENT_NOT_SET = 'CLIENT_NOT_SET',
  DATABASE_FAILURE = 'DATABASE_FAILURE',
  NO_CLIENT_ID = 'NO_CLIENT_ID',
  NO_USER_ID = 'NO_USER_ID',
  NO_VALID_CLIENT = 'NO_VALID_CLIENT',
  REQUEST_FAILURE = 'REQUEST_FAILURE',
  REQUEST_FORBIDDEN = 'REQUEST_FORBIDDEN',
  TOO_MANY_CLIENTS = 'TOO_MANY_CLIENTS',
}

export class ClientError extends BaseError {
  constructor(type: CLIENT_ERROR_TYPE | BASE_ERROR_TYPE, message: string) {
    super(type, message);
  }

  static get MESSAGE(): Record<CLIENT_ERROR_TYPE, string> {
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

  static get TYPE(): Record<CLIENT_ERROR_TYPE, CLIENT_ERROR_TYPE> {
    return {
      CLIENT_NOT_SET: CLIENT_ERROR_TYPE.CLIENT_NOT_SET,
      DATABASE_FAILURE: CLIENT_ERROR_TYPE.DATABASE_FAILURE,
      NO_CLIENT_ID: CLIENT_ERROR_TYPE.NO_CLIENT_ID,
      NO_USER_ID: CLIENT_ERROR_TYPE.NO_USER_ID,
      NO_VALID_CLIENT: CLIENT_ERROR_TYPE.NO_VALID_CLIENT,
      REQUEST_FAILURE: CLIENT_ERROR_TYPE.REQUEST_FAILURE,
      REQUEST_FORBIDDEN: CLIENT_ERROR_TYPE.REQUEST_FORBIDDEN,
      TOO_MANY_CLIENTS: CLIENT_ERROR_TYPE.TOO_MANY_CLIENTS,
    };
  }
}
