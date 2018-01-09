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

/* eslint no-magic-numbers: "off" */

const ProteusError = require('./ProteusError');

/** @module errors */

/**
 * @extends ProteusError
 * @param {string} [message]
 * @param {string} [code]
 * @returns {string}
 */
class InputError extends ProteusError {
  constructor(message = 'Invalid input', code = 4) {
    super(message, code);
  }

  static get CODE() {
    return {
      CASE_400: 400,
      CASE_401: 401,
      CASE_402: 402,
      CASE_403: 403,
      CASE_404: 404,
    };
  }
}

/**
 * @extends InputError
 * @param {string} [message]
 * @param {string} [code]
 * @returns {string}
 */
class RangeError extends InputError {
  constructor(message = 'Invalid type', code) {
    super(message, code);
  }
}

/**
 * @extends InputError
 * @param {string} [message]
 * @param {string} [code]
 * @returns {string}
 */
class TypeError extends InputError {
  constructor(message = 'Invalid array length', code) {
    super(message, code);
  }
}

Object.assign(InputError, {
  RangeError,
  TypeError,
});

module.exports = ProteusError.InputError = InputError;
