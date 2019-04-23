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

import {ProteusError} from '../errors/ProteusError';

function assert_is_not_zeros(array: number[] | Uint8Array): void {
  let only_zeroes = true;
  for (const val in array) {
    if (parseInt(val) > 0) {
      only_zeroes = false;
      break;
    }
  }

  if (only_zeroes === true) {
    throw new ProteusError('Array consists only of zeroes.', ProteusError.CODE.CASE_100);
  }
}

/** Concatenates array buffers (usually 8-bit unsigned). */
function concatenate_array_buffers(buffers: Uint8Array[]): Uint8Array {
  return buffers.reduce(
    (accumulator: Uint8Array, bytes: Uint8Array): Uint8Array => {
      const buffer = new Uint8Array(accumulator.byteLength + bytes.byteLength);
      buffer.set(accumulator, 0);
      buffer.set(bytes, accumulator.byteLength);
      return buffer;
    }
  );
}

export {assert_is_not_zeros, concatenate_array_buffers};
