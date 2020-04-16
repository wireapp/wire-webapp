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

/* eslint-disable no-magic-numbers */

import * as Proteus from '@wireapp/proteus';
import * as sodium from 'libsodium-wrappers-sumo';

beforeAll(async () => {
  await sodium.ready;
});

describe('Message', () => {
  const sessionTag = new Proteus.message.SessionTag();
  sessionTag.tag.fill(42);

  const baseKey = new Proteus.keys.PublicKey(
    // prettier-ignore
    new Uint8Array([226, 201, 222, 33, 39, 107, 40, 144, 176, 61, 100, 172, 187, 75, 226, 187, 56, 224, 93, 172, 160, 59, 23, 5, 89, 135, 147, 150, 186, 35, 251, 244]),
    // prettier-ignore
    new Uint8Array([239, 255, 64, 169, 64, 181, 174, 73, 140, 59, 238, 132, 78, 180, 124, 168, 31, 86, 109, 137, 143, 133, 99, 134, 196, 21, 48, 194, 228, 57, 143, 97]),
  );
  const ratchetKey = new Proteus.keys.PublicKey(
    // prettier-ignore
    new Uint8Array([133, 117, 192, 130, 228, 136, 206, 141, 238, 5, 132, 167, 121, 244, 82, 240, 233, 26, 205, 137, 188, 232, 29, 172, 208, 55, 162, 118, 135, 79, 197, 15]),
    // prettier-ignore
    new Uint8Array([136, 242, 230, 94, 41, 142, 44, 0, 181, 172, 69, 159, 61, 246, 118, 230, 28, 211, 115, 255, 177, 61, 31, 160, 108, 154, 194, 3, 208, 25, 139, 63]),
  );
  const publicIdentityKey = new Proteus.keys.PublicKey(
    // prettier-ignore
    new Uint8Array([159, 59, 98, 66, 70, 188, 133, 198, 240, 219, 174, 199, 124, 130, 51, 101, 242, 243, 137, 16, 44, 8, 130, 189, 245, 168, 190, 133, 108, 42, 103, 126]),
    // prettier-ignore
    new Uint8Array([222, 129, 110, 54, 26, 250, 178, 102, 255, 166, 210, 24, 142, 190, 231, 7, 140, 141, 253, 162, 102, 219, 176, 11, 169, 131, 39, 12, 103, 74, 232, 44]),
  );
  const identityKey = new Proteus.keys.IdentityKey(publicIdentityKey);

  it('serialises and deserialises a CipherMessage correctly', () => {
    const expected =
      '01a500502a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a010c020d03a10058208575c082e488ce8dee0584a779f452f0e91acd89bce81dacd037a276874fc50f044a0102030405060708090a';

    const msg = new Proteus.message.CipherMessage(
      sessionTag,
      12,
      13,
      ratchetKey,
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );

    const bytes = new Uint8Array(msg.serialise());
    expect(expected).toBe(sodium.to_hex(bytes).toLowerCase());

    const deserialised = Proteus.message.Message.deserialise<Proteus.message.CipherMessage>(bytes.buffer);
    expect(deserialised.constructor).toBe(Proteus.message.CipherMessage);
    expect(deserialised.ratchet_key.fingerprint()).toBe(ratchetKey.fingerprint());
  });

  it('serialises a PreKeyMessage correctly', () => {
    const expected =
      '02a400181801a1005820e2c9de21276b2890b03d64acbb4be2bb38e05daca03b170559879396ba23fbf402a100a10058209f3b624246bc85c6f0dbaec77c823365f2f389102c0882bdf5a8be856c2a677e03a500502a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a010c020d03a10058208575c082e488ce8dee0584a779f452f0e91acd89bce81dacd037a276874fc50f044a0102030405060708090a';

    const cipherMessage = new Proteus.message.CipherMessage(
      sessionTag,
      12,
      13,
      ratchetKey,
      new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
    );
    const preKeyMessage = new Proteus.message.PreKeyMessage(24, baseKey, identityKey, cipherMessage);

    const bytes = new Uint8Array(preKeyMessage.serialise());
    expect(expected).toBe(sodium.to_hex(bytes).toLowerCase());

    const deserialised = Proteus.message.Message.deserialise<Proteus.message.PreKeyMessage>(bytes.buffer);
    expect(deserialised.constructor).toBe(Proteus.message.PreKeyMessage);

    expect(deserialised.base_key.fingerprint()).toBe(baseKey.fingerprint());
    expect(deserialised.identity_key.fingerprint()).toBe(identityKey.fingerprint());

    expect(deserialised.message.ratchet_key.fingerprint()).toBe(ratchetKey.fingerprint());
  });
});
