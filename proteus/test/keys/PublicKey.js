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

describe('Public Key', () => {
  it('should reject shared secrets at the point of infinity', () => {
    const emptyCurve = new Uint8Array([1].concat(Array.from({length: 30})));
    const alice_keypair = Proteus.keys.KeyPair.new();
    const bob_keypair = Proteus.keys.KeyPair.new();

    assert.deepEqual(
      alice_keypair.secret_key.shared_secret(bob_keypair.public_key),
      bob_keypair.secret_key.shared_secret(alice_keypair.public_key)
    );

    bob_keypair.public_key.pub_curve = emptyCurve;

    assert.throws(() => alice_keypair.secret_key.shared_secret(bob_keypair.public_key));
  });
});
