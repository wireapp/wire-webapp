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
window.z.permission = z.permission || {};

z.permission.PermissionError = class PermissionError extends Error {
  constructor(type) {
    super();
    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || PermissionError.TYPE.UNKNOWN;
    switch (this.type) {
      case PermissionError.TYPE.DENIED: {
        this.message = 'Permission was denied';
        break;
      }

      case PermissionError.TYPE.UNSUPPORTED: {
        this.message = 'Permissions API is not supported';
        break;
      }

      case PermissionError.TYPE.UNSUPPORTED_TYPE: {
        this.message = 'Permissions API does not support requested type';
        break;
      }

      default: {
        this.message = 'Unknown Permission Error';
      }
    }
  }

  static get TYPE() {
    return {
      DENIED: 'PermissionError.TYPE.DENIED',
      UNKNOWN: 'PermissionError.TYPE.UNKNOWN',
      UNSUPPORTED: 'PermissionError.TYPE.UNSUPPORTED',
      UNSUPPORTED_TYPE: 'PermissionError.TYPE.UNSUPPORTED_TYPE',
    };
  }
};
