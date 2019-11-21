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

// tslint:disable:no-magic-numbers

import * as Proteus from '@wireapp/proteus';
import * as sodium from 'libsodium-wrappers-sumo';

beforeAll(async () => {
  await sodium.ready;
});

describe('Key Derivation Function (KDF)', () => {
  it('generates Cipher Key and Mac Key', () => {
    // prettier-ignore
    const input = new Uint8Array([80, 126, 195, 116, 121, 19, 181, 29, 146, 68, 194, 215, 190, 132, 202, 217, 199, 26, 91, 4, 184, 156, 73, 204, 158, 76, 129, 220, 126, 178, 210, 92]);
    // prettier-ignore
    const expected_cipher_key = new Uint8Array([22, 57, 15, 160, 231, 231, 169, 183, 205, 22, 179, 228, 53, 51, 14, 24, 160, 45, 247, 19, 106, 21, 78, 92, 110, 56, 24, 84, 156, 117, 177, 176]);
    // prettier-ignore
    const expected_mac_key = new Uint8Array([186, 163, 142, 225, 211, 131, 100, 164, 80, 51, 180, 42, 177, 132, 72, 250, 246, 241, 41, 108, 146, 140, 247, 197, 205, 242, 32, 150, 186, 122, 45, 57]);
    const info = 'hash_ratchet';

    const derived_secret = Proteus.derived.DerivedSecrets.kdf_without_salt(input, info);

    const cipher_key = derived_secret.cipher_key.key;
    const mac_key = derived_secret.mac_key.key;

    expect(cipher_key).toEqual(expected_cipher_key);
    expect(cipher_key.byteLength).toBe(32);

    expect(mac_key).toEqual(expected_mac_key);
    expect(mac_key.byteLength).toBe(32);
  });

  it('can encrypt and decrypt text', () => {
    const info = 'foobar';
    const input = sodium.from_string('346234876');
    const nonce = sodium.from_string('00000000');
    const plain_text = sodium.from_string('plaintext');

    const derived_secret = Proteus.derived.DerivedSecrets.kdf_without_salt(input, info);

    const encrypted_text = derived_secret.cipher_key.encrypt(plain_text, nonce);
    expect(encrypted_text).not.toEqual(plain_text);

    const decrypted_text = derived_secret.cipher_key.decrypt(encrypted_text, nonce);
    expect(decrypted_text).toEqual(plain_text);
  });
});
