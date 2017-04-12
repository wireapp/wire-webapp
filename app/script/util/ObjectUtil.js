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
  map_recursive(object, mapping_function) {
    if (typeof object !== 'object') {
      return mapping_function(object);
    }

    let new_object = {};

    for (const property in object) {
      if (object.hasOwnProperty(property)) {
        new_object[property] = z.util.ObjectUtil.map_recursive(object[property], mapping_function);
      }
    }

    return new_object;
  },
  escape_properties(object) {
    return z.util.ObjectUtil.map_recursive(object, _.escape);
  }
};
