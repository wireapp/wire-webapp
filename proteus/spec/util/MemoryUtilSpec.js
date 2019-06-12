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

const Proteus = require('@wireapp/proteus');

describe('MemoryUtil', () => {
  describe('zeroize', () => {
    it('zeroizes an ArrayBuffer', () => {
      const array_length = 32;

      const buffer_random = new ArrayBuffer(array_length);
      const random_max = 10;
      const random_min = 1;

      new Uint8Array(buffer_random).fill(Math.random() * random_max + random_min);

      Proteus.util.MemoryUtil.zeroize(buffer_random);
      new Uint8Array(buffer_random).every(value => expect(value).toBe(0));
    });

    it('zeroizes an Uint8Array', () => {
      const array_length = 32;
      const random_max = 10;
      const random_min = 1;

      const array_random = Uint8Array.from({length: array_length}, () => Math.random() * random_max + random_min);

      expect(array_random.length).toBe(array_length);
      Proteus.util.MemoryUtil.zeroize(array_random);
      array_random.every(value => expect(value).toBe(0));
    });

    it('deeply zeroizes a KeyPair', async () => {
      const key_pair = await Proteus.keys.KeyPair.new();

      Proteus.util.MemoryUtil.zeroize(key_pair);
      key_pair.secret_key.sec_edward.every(value => expect(value).toBe(0));
      key_pair.secret_key.sec_curve.every(value => expect(value).toBe(0));
    });

    it('deeply zeroizes a PreKey', async () => {
      const prekey = await Proteus.keys.PreKey.new(0);

      Proteus.util.MemoryUtil.zeroize(prekey);
      prekey.key_pair.secret_key.sec_edward.every(value => expect(value).toBe(0));
      prekey.key_pair.secret_key.sec_curve.every(value => expect(value).toBe(0));
    });
  });
});
