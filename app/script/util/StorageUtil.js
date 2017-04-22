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

z.util.StorageUtil = {
  get_value: function(key) {
    return amplify.store(key);
  },
  reset_value: function(key) {
    return z.util.StorageUtil.set_value(key, null);
  },
  set_value: function(key, value, seconds_to_expire) {
    if (seconds_to_expire) {
      amplify.store(key, value, {expires: seconds_to_expire * 1000});
    } else {
      amplify.store(key, value);
    }
  }
};
