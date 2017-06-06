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

z.util.KEYCODE = {
  ARROW_DOWN: 40,
  ARROW_LEFT: 37,
  ARROW_RIGHT: 39,
  ARROW_UP: 38,
  BACKSPACE: 46,
  DELETE: 8,
  ENTER: 13,
  ESC: 27,
  KEY_V: 86,
  SPACE: 32,
  TAB: 9,
  is_arrow_key: function(keyCode) {
    return [
      z.util.KEYCODE.ARROW_DOWN,
      z.util.KEYCODE.ARROW_LEFT,
      z.util.KEYCODE.ARROW_RIGHT,
      z.util.KEYCODE.ARROW_UP,
    ].includes(keyCode);
  },
};
