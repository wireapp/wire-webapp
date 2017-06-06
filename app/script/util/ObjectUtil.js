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
window.z.util = z.util || {};

z.util.ObjectUtil = {
  /**
   * Escapes all properties of a given object.
   * @param {Object} object - Base object
   * @returns {Object} Object copy with escaped properties
   */
  escape_properties(object) {
    return z.util.ObjectUtil.map_recursive(object, _.escape);
  },
  /**
   * Creates an object copy and applies a mapping functions to all properties of that object.
   *
   * @param {Object} object - Base object
   * @param {Function} mapping_function - Mapping function
   * @returns {Object} Object copy with mapped properties
   */
  map_recursive(object, mapping_function) {
    if (typeof object !== 'object') {
      return mapping_function(object);
    }

    const new_object = {};

    for (const property in object) {
      if (object.hasOwnProperty(property)) {
        new_object[property] = z.util.ObjectUtil.map_recursive(
          object[property],
          mapping_function,
        );
      }
    }

    return new_object;
  },
};
