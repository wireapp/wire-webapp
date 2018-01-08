/*
 * Wire
 * Copyright (C) 2016 Wire Swiss GmbH
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

const BaseError = require('./BaseError');

/**
 * @class DecodeError
 * @param {string} message
 * @param {*} [extra]
 */
class DecodeError extends BaseError {
  constructor(message, extra) {
    super(message);
    this.extra = extra;
  }

  /** @type {string} */
  static get INVALID_TYPE() {
    return 'Invalid type';
  }

  /** @type {string} */
  static get UNEXPECTED_EOF() {
    return 'Unexpected end-of-buffer';
  }

  /** @type {string} */
  static get UNEXPECTED_TYPE() {
    return 'Unexpected type';
  }

  /** @type {string} */
  static get INT_OVERFLOW() {
    return 'Integer overflow';
  }

  /** @type {string} */
  static get TOO_LONG() {
    return 'Field too long';
  }

  /** @type {string} */
  static get TOO_NESTED() {
    return 'Object nested too deep';
  }
}

module.exports = DecodeError;
