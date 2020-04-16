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

describe('KeyPair', () => {
  it('signs a message and verifies the signature', async () => {
    const keyPair = await Proteus.keys.KeyPair.new();
    const message = 'what do ya want for nothing?';
    const signature = keyPair.secret_key.sign(message);
    const badSignature = new Uint8Array(signature);

    badSignature.forEach((obj, index) => {
      badSignature[index] = ~badSignature[index];
    });

    expect(keyPair.public_key.verify(signature, message)).toBe(true);
    expect(keyPair.public_key.verify(badSignature, message)).toBe(false);
  });

  it('computes a Diffie-Hellman shared secret', async () => {
    const [keypair_a, keypair_b] = await Promise.all([Proteus.keys.KeyPair.new(), Proteus.keys.KeyPair.new()]);
    const shared_a = keypair_a.secret_key.shared_secret(keypair_b.public_key);
    const shared_b = keypair_b.secret_key.shared_secret(keypair_a.public_key);
    expect(shared_a).toEqual(shared_b);
  });
});
