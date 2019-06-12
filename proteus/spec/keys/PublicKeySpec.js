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

describe('Public Key', () => {
  it('rejects shared secrets at the point of infinity', async () => {
    try {
      const emptyCurve = new Uint8Array([1].concat(Array.from({length: 30})));
      const alice_keypair = await Proteus.keys.KeyPair.new();
      const bob_keypair = await Proteus.keys.KeyPair.new();

      const alice_sk = alice_keypair.secret_key.shared_secret(bob_keypair.public_key);
      const bob_sk = bob_keypair.secret_key.shared_secret(alice_keypair.public_key);

      expect(alice_sk).toEqual(bob_sk);

      bob_keypair.public_key.pub_curve = emptyCurve;

      alice_keypair.secret_key.shared_secret(bob_keypair.public_key);

      fail();
    } catch (error) {
      expect(error instanceof TypeError).toBe(true);
    }
  });
});
