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
const _sodium = require('libsodium-wrappers-sumo');
let sodium = _sodium;

beforeAll(async () => {
  await _sodium.ready;
  sodium = _sodium;
});

describe('Message', () => {
  const st = Proteus.message.SessionTag.new();
  st.tag.fill(42);

  const bk = Proteus.keys.PublicKey.new(
    new Uint8Array(32).fill(0xff),
    // eslint-disable-next-line
    new Uint8Array([63, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75, 75]),
  );
  const rk = Proteus.keys.PublicKey.new(
    new Uint8Array(32).fill(0xf0),
    // eslint-disable-next-line
    new Uint8Array([185, 178, 44, 203, 178, 44, 203, 178, 44, 203, 178, 44, 203, 178, 44, 203, 178, 44, 203, 178, 44, 203, 178, 44, 203, 178, 44, 203, 178, 44, 203, 114]),
  );
  const ik_pk = Proteus.keys.PublicKey.new(
    new Uint8Array(32).fill(0xa0),
    // eslint-disable-next-line
    new Uint8Array([92, 62, 6, 231, 99, 112, 62, 6, 231, 99, 112, 62, 6, 231, 99, 112, 62, 6, 231, 99, 112, 62, 6, 231, 99, 112, 62, 6, 231, 99, 112, 126]),
  );
  const ik = Proteus.keys.IdentityKey.new(ik_pk);

  it('serialises and deserialises a CipherMessage correctly', () => {
    const expected =
      '01a500502a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a010c020d03a1005820f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0044a0102030405060708090a';

    const msg = Proteus.message.CipherMessage.new(st, 12, 13, rk, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));

    const bytes = new Uint8Array(msg.serialise());
    expect(expected).toBe(sodium.to_hex(bytes).toLowerCase());

    const deserialised = Proteus.message.Message.deserialise(bytes.buffer);
    expect(deserialised.constructor).toBe(Proteus.message.CipherMessage);
    expect(deserialised.ratchet_key.fingerprint()).toBe(rk.fingerprint());
  });

  it('serialises a PreKeyMessage correctly', () => {
    const expected =
      '02a400181801a1005820ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff02a100a1005820a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a0a003a500502a2a2a2a2a2a2a2a2a2a2a2a2a2a2a2a010c020d03a1005820f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0f0044a0102030405060708090a';

    const cmsg = Proteus.message.CipherMessage.new(st, 12, 13, rk, new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]));
    const pkmsg = Proteus.message.PreKeyMessage.new(24, bk, ik, cmsg);

    const bytes = new Uint8Array(pkmsg.serialise());
    expect(expected).toBe(sodium.to_hex(bytes).toLowerCase());

    const deserialised = Proteus.message.Message.deserialise(bytes.buffer);
    expect(deserialised.constructor).toBe(Proteus.message.PreKeyMessage);

    expect(deserialised.base_key.fingerprint()).toBe(bk.fingerprint());
    expect(deserialised.identity_key.fingerprint()).toBe(ik.fingerprint());

    expect(deserialised.message.ratchet_key.fingerprint()).toBe(rk.fingerprint());
  });
});
