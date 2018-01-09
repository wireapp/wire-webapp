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

/** @module errors */

/**
 * @class ProteusError
 * @param {!string} message
 * @param {string} [code]
 * @extends Error
 * @returns {ProteusError} - `this`
 */
const ProteusError = (function() {
  const func = function(message, code = 1) {
    this.code = code;
    this.message = message;
    this.name = this.constructor.name;
    this.stack = new Error().stack;
  };

  func.prototype = new Error();
  func.prototype.constructor = func;
  func.prototype.CODE = {
    CASE_100: 100,
    CASE_101: 101,
    CASE_102: 102,
    CASE_103: 103,
    CASE_104: 104,
  };

  return func;
})();

module.exports = ProteusError;
