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

enum ACCESS_TOKEN_ERROR_TYPE {
  NOT_FOUND_IN_CACHE = 'NOT_FOUND_IN_CACHE',
  REQUEST_FAILED = 'REQUEST_FAILED',
  REQUEST_FORBIDDEN = 'REQUEST_FORBIDDEN',
  RETRIES_EXCEEDED = 'RETRIES_EXCEEDED',
}

export class AccessTokenError extends BaseError {
  constructor(type: ACCESS_TOKEN_ERROR_TYPE | BASE_ERROR_TYPE, message: string) {
    super(type, message);
  }

  static get MESSAGE(): Record<ACCESS_TOKEN_ERROR_TYPE, string> {
    return {
      NOT_FOUND_IN_CACHE: 'No cached access token found in Local Storage',
      REQUEST_FAILED: 'Exceeded allowed number of retries to get Access Token',
      REQUEST_FORBIDDEN: 'Request to POST for access token failed',
      RETRIES_EXCEEDED: 'Request to POST for access token forbidden',
    };
  }

  static get TYPE(): Record<ACCESS_TOKEN_ERROR_TYPE, ACCESS_TOKEN_ERROR_TYPE> {
    return {
      NOT_FOUND_IN_CACHE: ACCESS_TOKEN_ERROR_TYPE.NOT_FOUND_IN_CACHE,
      REQUEST_FAILED: ACCESS_TOKEN_ERROR_TYPE.REQUEST_FAILED,
      REQUEST_FORBIDDEN: ACCESS_TOKEN_ERROR_TYPE.REQUEST_FORBIDDEN,
      RETRIES_EXCEEDED: ACCESS_TOKEN_ERROR_TYPE.RETRIES_EXCEEDED,
    };
  }
}
