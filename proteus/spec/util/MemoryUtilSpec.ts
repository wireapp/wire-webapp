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

import * as Proteus from '@wireapp/proteus';

describe('MemoryUtil', () => {
  describe('zeroize', () => {
    it('zeroizes an ArrayBuffer', () => {
      const arrayLength = 32;

      const randomBuffer = new ArrayBuffer(arrayLength);
      const randomMax = 10;
      const randomMin = 1;

      new Uint8Array(randomBuffer).fill(Math.random() * randomMax + randomMin);

      Proteus.util.MemoryUtil.zeroize(randomBuffer);
      new Uint8Array(randomBuffer).every(value => expect(value).toBe(0));
    });

    it('zeroizes an Uint8Array', () => {
      const arrayLength = 32;
      const randomMax = 10;
      const randomMin = 1;

      const randomArray = Uint8Array.from({length: arrayLength}, () => Math.random() * randomMax + randomMin);

      expect(randomArray.length).toBe(arrayLength);
      Proteus.util.MemoryUtil.zeroize(randomArray);
      randomArray.every(value => expect(value).toBe(0));
    });

    it('deeply zeroizes a KeyPair', async () => {
      const keyPair = await Proteus.keys.KeyPair.new();

      Proteus.util.MemoryUtil.zeroize(keyPair);
      keyPair.secret_key.sec_edward.every(value => expect(value).toBe(0));
      keyPair.secret_key.sec_curve.every(value => expect(value).toBe(0));
    });

    it('deeply zeroizes a PreKey', async () => {
      const prekey = await Proteus.keys.PreKey.new(0);

      Proteus.util.MemoryUtil.zeroize(prekey);
      prekey.key_pair.secret_key.sec_edward.every(value => expect(value).toBe(0));
      prekey.key_pair.secret_key.sec_curve.every(value => expect(value).toBe(0));
    });
  });
});
