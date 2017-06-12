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
window.z.auth = z.auth || {};

z.auth.AuthError = class AuthError extends Error {
  constructor(type) {
    super();

    this.name = this.constructor.name;
    this.stack = (new Error()).stack;
    this.type = type || AuthError.TYPE.UNKNOWN;

    switch (this.type) {
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
      INDEXED_DB_UNSUPPORTED: 'z.auth.AuthError.TYPE.INDEXED_DB_UNSUPPORTED',
      MULTIPLE_TABS: 'z.auth.AuthError.TYPE.MULTIPLE_TABS',
      PRIVATE_MODE: 'z.auth.AuthError.TYPE.PRIVATE_MODE',
    };
  }
};
