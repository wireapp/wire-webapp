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

const InputError = require('../errors/InputError');

/** @module util */

const TypeUtil = {
  /**
   * @param {*} classes
   * @param {*} inst
   * @returns {void}
   * @throws {errors.InputError.TypeError}
   */
  assert_is_instance(classes, inst) {
    if (!Array.isArray(classes)) {
      classes = [classes];
    }
    if (classes.some(_class => inst instanceof _class || (inst && inst.prototype instanceof _class))) {
      return;
    }
    const valid_types = classes.map(_class => `'${_class.name}'`).join(' or ');
    if (inst) {
      throw new InputError.TypeError(
        `Expected one of ${valid_types}, got '${inst.constructor.name}'.`,
        InputError.CODE.CASE_401
      );
    }
    throw new InputError.TypeError(`Expected one of ${valid_types}, got '${String(inst)}'.`, InputError.CODE.CASE_402);
  },
  /**
   * @param {*} inst
   * @returns {boolean}
   * @throws {errors.InputError.TypeError}
   */
  assert_is_integer(inst) {
    if (Number.isInteger(inst)) {
      return true;
    }
    if (inst) {
      throw new InputError.TypeError(`Expected integer, got '${inst.constructor.name}'.`, InputError.CODE.CASE_403);
    }
    throw new InputError.TypeError(`Expected integer, got '${String(inst)}'.`, InputError.CODE.CASE_404);
  },
};

module.exports = TypeUtil;
