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

describe('Mac Key', () => {
  it('encodes a message', () => {
    const key_material_buffer = new ArrayBuffer(32);
    const typed_key_material = new Uint8Array(key_material_buffer);
    const mac_key = Proteus.derived.MacKey.new(typed_key_material);
    const message = sodium.from_string('hello');

    const authentication_code = mac_key.sign(message);

    const expected = new Uint8Array([
      67,
      82,
      178,
      110,
      51,
      254,
      13,
      118,
      154,
      137,
      34,
      166,
      186,
      41,
      0,
      65,
      9,
      240,
      22,
      136,
      226,
      106,
      204,
      158,
      108,
      179,
      71,
      229,
      165,
      175,
      196,
      218,
    ]);

    assert.deepEqual(authentication_code, expected);
  });
});
