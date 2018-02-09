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

/* eslint no-magic-numbers: "off" */

const Proteus = require('@wireapp/proteus');

describe('HMAC-based Key Derivation Function', () => {
  it('creates a new buffer from a given buffer', () => {
    const actual = Proteus.util.ArrayUtil.concatenate_array_buffers([new Uint8Array([1, 2, 3])]);
    const expected = new Uint8Array([1, 2, 3]);
    expect(actual).toEqual(expected);
  });

  it('concatenates two buffers', () => {
    const actual = Proteus.util.ArrayUtil.concatenate_array_buffers([
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4, 5, 6]),
    ]);
    const expected = new Uint8Array([1, 2, 3, 4, 5, 6]);
    expect(actual).toEqual(expected);
  });

  it('concatenates three buffers', () => {
    const actual = Proteus.util.ArrayUtil.concatenate_array_buffers([
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4, 5, 6]),
      new Uint8Array([7, 8, 9]),
    ]);
    const expected = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(actual).toEqual(expected);
  });

  it('concatenates four buffers', () => {
    const actual = Proteus.util.ArrayUtil.concatenate_array_buffers([
      new Uint8Array([1, 2, 3]),
      new Uint8Array([4, 5, 6]),
      new Uint8Array([7, 8, 9]),
      new Uint8Array([10, 11, 12]),
    ]);
    const expected = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    expect(actual).toEqual(expected);
  });
});
