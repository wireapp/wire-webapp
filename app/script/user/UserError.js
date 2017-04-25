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
window.z.user = z.user || {};

z.user.UserError = class UserError extends Error {
  constructor(type) {
    super();

    this.name = this.constructor.name;
    this.stack = (new Error()).stack;
    this.type = type || z.connect.UserError.TYPE.UNKNOWN;

    switch (this.type) {
      case z.user.UserError.TYPE.PRE_KEY_NOT_FOUND:
        this.message = 'Pre-key not found';
        break;
      case z.user.UserError.TYPE.REQUEST_FAILURE:
        this.message = 'User related backend request failure';
        break;
      case z.user.UserError.TYPE.USER_NOT_FOUND:
        this.message = 'User not found';
        break;
      case z.user.UserError.TYPE.USERNAME_TAKEN:
        this.message = 'Username is already taken';
        break;
      default:
        this.message = 'Unknown UserError';
        break;
    }
  }

  static get TYPE() {
    return {
      PRE_KEY_NOT_FOUND: 'z.user.UserError.TYPE.PRE_KEY_NOT_FOUND',
      REQUEST_FAILURE: 'z.user.UserError.TYPE.REQUEST_FAILURE',
      UNKNOWN: 'z.user.UserError.TYPE.UNKNOWN',
      USER_NOT_FOUND: 'z.user.UserError.TYPE.USER_NOT_FOUND',
      USERNAME_TAKEN: 'z.user.UserError.TYPE.USERNAME_TAKEN',
    };
  }
};
