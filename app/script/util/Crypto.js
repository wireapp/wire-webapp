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

z.util.Crypto = {
  Hashing: {
    joaat_hash(str) {
      const {uint32} = window;
      let hash = uint32.toUint32(0);
      const key = str.toLowerCase();

      for (let index = 0; index <= key.length - 1; index++) {
        hash = uint32.addMod32(hash, uint32.toUint32(key.charCodeAt(index)));
        hash = uint32.addMod32(hash, uint32.shiftLeft(hash, 10));
        hash = uint32.xor(hash, uint32.shiftRight(hash, 6));
      }

      hash = uint32.addMod32(hash, uint32.shiftLeft(hash, 3));
      hash = uint32.xor(hash, uint32.shiftRight(hash, 11));
      hash = uint32.addMod32(hash, uint32.shiftLeft(hash, 15));

      return hash;
    },
  },
};
