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

enum AUTH_ERROR_TYPE {
  COOKIES_DISABLED = 'COOKIES_DISABLED',
  INDEXED_DB_UNSUPPORTED = 'INDEXED_DB_UNSUPPORTED',
  MULTIPLE_TABS = 'MULTIPLE_TABS',
  PRIVATE_MODE = 'PRIVATE_MODE',
}

export class AuthError extends BaseError {
  constructor(type: AUTH_ERROR_TYPE | BASE_ERROR_TYPE, message: string) {
    super(type, message);
  }

  static get MESSAGE(): Record<AUTH_ERROR_TYPE, string> {
    return {
      COOKIES_DISABLED: 'Cookies are disabled',
      INDEXED_DB_UNSUPPORTED: 'IndexedDB is not supported',
      MULTIPLE_TABS: 'Cannot open in multiple tabs simultaneously',
      PRIVATE_MODE: 'Unsupported Private Mode',
    };
  }

  static get TYPE(): Record<AUTH_ERROR_TYPE, AUTH_ERROR_TYPE> {
    return {
      COOKIES_DISABLED: AUTH_ERROR_TYPE.COOKIES_DISABLED,
      INDEXED_DB_UNSUPPORTED: AUTH_ERROR_TYPE.INDEXED_DB_UNSUPPORTED,
      MULTIPLE_TABS: AUTH_ERROR_TYPE.MULTIPLE_TABS,
      PRIVATE_MODE: AUTH_ERROR_TYPE.PRIVATE_MODE,
    };
  }
}
