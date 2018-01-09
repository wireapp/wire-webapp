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

describe('MemoryUtil', () => {
  describe('zeroize', () => {
    it('zeroizes an ArrayBuffer', () => {
      const array_length = 32;

      const buffer_random = new ArrayBuffer(array_length);
      const random_max = 10;
      const random_min = 1;

      new Uint8Array(buffer_random).fill(Math.random() * random_max + random_min);

      Proteus.util.MemoryUtil.zeroize(buffer_random);
      new Uint8Array(buffer_random).every(value => assert.strictEqual(value, 0));
    });

    it('zeroizes an Uint8Array', () => {
      const array_length = 32;
      const random_max = 10;
      const random_min = 1;

      const array_random = Uint8Array.from({length: array_length}, () => Math.random() * random_max + random_min);

      assert.lengthOf(array_random, array_length);
      Proteus.util.MemoryUtil.zeroize(array_random);
      array_random.every(value => assert.strictEqual(value, 0));
    });

    it('deeply zeroizes a KeyPair', () => {
      const key_pair = Proteus.keys.KeyPair.new();

      Proteus.util.MemoryUtil.zeroize(key_pair);
      key_pair.secret_key.sec_edward.every(value => assert.strictEqual(value, 0));
      key_pair.secret_key.sec_curve.every(value => assert.strictEqual(value, 0));
    });
  });
});
