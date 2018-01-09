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

/* eslint no-magic-numbers: "off" */

describe('HMAC-based Key Derivation Function', () => {
  it('concatenates buffers together', () => {
    assert.deepEqual(
      Proteus.util.ArrayUtil.concatenate_array_buffers([new Uint8Array([1, 2, 3])]),
      new Uint8Array([1, 2, 3])
    );

    assert.deepEqual(
      Proteus.util.ArrayUtil.concatenate_array_buffers([new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])]),
      new Uint8Array([1, 2, 3, 4, 5, 6])
    );

    assert.deepEqual(
      Proteus.util.ArrayUtil.concatenate_array_buffers([
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6]),
        new Uint8Array([7, 8, 9]),
      ]),
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])
    );

    assert.deepEqual(
      Proteus.util.ArrayUtil.concatenate_array_buffers([
        new Uint8Array([1, 2, 3]),
        new Uint8Array([4, 5, 6]),
        new Uint8Array([7, 8, 9]),
        new Uint8Array([10, 11, 12]),
      ]),
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    );
  });
});
