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

'use strict';

window.z = window.z || {};
window.z.auth = z.auth || {};

z.auth.AuthError = class AuthError extends Error {
  constructor(type) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || AuthError.TYPE.UNKNOWN;

    switch (this.type) {
      case AuthError.TYPE.COOKIES_DISABLED:
        this.message = 'Cookies are disabled';
        break;
      case AuthError.TYPE.INDEXED_DB_UNSUPPORTED:
        this.message = 'IndexedDB is not supported';
        break;
      case AuthError.TYPE.MULTIPLE_TABS:
        this.message = 'Cannot open in multiple tabs simultaneously';
        break;
      case AuthError.TYPE.PRIVATE_MODE:
        this.message = 'Unsupported Private Mode';
        break;
      default:
        this.message = 'Unknown AuthError';
    }
  }

  static get TYPE() {
    return {
      COOKIES_DISABLED: 'AuthError.TYPE.COOKIES_DISABLED',
      INDEXED_DB_UNSUPPORTED: 'AuthError.TYPE.INDEXED_DB_UNSUPPORTED',
      MULTIPLE_TABS: 'AuthError.TYPE.MULTIPLE_TABS',
      PRIVATE_MODE: 'AuthError.TYPE.PRIVATE_MODE',
    };
  }
};
