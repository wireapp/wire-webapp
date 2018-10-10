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
window.z.error = z.error || {};

z.error.BaseError = class BaseError extends Error {
  constructor(errorName, type, message) {
    super();

    this.name = this.constructor.name;
    this.stack = new Error().stack;
    this.type = type || BaseError.TYPE.UNKNOWN;

    this.message = message || z.error[errorName].MESSAGE[this.type] || BaseError.MESSAGE[this.type];
    if (!message) {
      this.message = `${BaseError.MESSAGE.UNKNOWN} ${errorName}`;
    }
  }

  static get MESSAGE() {
    return {
      INVALID_PARAMETER: 'Invalid parameter passed',
      MISSING_PARAMETER: 'Required parameter is not defined',
      NOT_FOUND: '',
      UNKNOWN: 'Unknown',
    };
  }

  static get TYPE() {
    return {
      INVALID_PARAMETER: 'INVALID_PARAMETER',
      MISSING_PARAMETER: 'MISSING_PARAMETER',
      NOT_FOUND: 'NOT_FOUND',
      UNKNOWN: 'UNKNOWN',
    };
  }
};
