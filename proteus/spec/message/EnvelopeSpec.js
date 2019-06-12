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
const CBOR = require('@wireapp/cbor');

describe('Envelope', () => {
  const mac_key = new Proteus.derived.MacKey(new Uint8Array(32).fill(1));

  const session_tag = Proteus.message.SessionTag.new();

  let identity_key;
  let base_key;
  let ratchet_key;

  beforeAll(async () => {
    identity_key = Proteus.keys.IdentityKey.new((await Proteus.keys.KeyPair.new()).public_key);
    base_key = (await Proteus.keys.KeyPair.new()).public_key;
    ratchet_key = (await Proteus.keys.KeyPair.new()).public_key;
  });

  it('encapsulates a CipherMessage', () => {
    const msg = Proteus.message.CipherMessage.new(session_tag, 42, 3, ratchet_key, new Uint8Array([1, 2, 3, 4, 5]));
    const env = Proteus.message.Envelope.new(mac_key, msg);

    expect(env.verify(mac_key)).toBe(true);
  });

  it('encapsulates a PreKeyMessage', () => {
    const msg = Proteus.message.PreKeyMessage.new(
      42,
      base_key,
      identity_key,
      Proteus.message.CipherMessage.new(session_tag, 42, 43, ratchet_key, new Uint8Array([1, 2, 3, 4]))
    );

    const env = Proteus.message.Envelope.new(mac_key, msg);
    expect(env.verify(mac_key)).toBe(true);
  });

  it('encodes to and decode from CBOR', () => {
    const msg = Proteus.message.PreKeyMessage.new(
      42,
      base_key,
      identity_key,
      Proteus.message.CipherMessage.new(session_tag, 42, 43, ratchet_key, new Uint8Array([1, 2, 3, 4]))
    );

    const env = Proteus.message.Envelope.new(mac_key, msg);
    expect(env.verify(mac_key)).toBe(true);

    const env_bytes = env.serialise();
    const env_cpy = Proteus.message.Envelope.deserialise(env_bytes);

    expect(env_cpy.verify(mac_key)).toBe(true);
  });

  it('fails when passing invalid input', () => {
    const empty_buffer = new ArrayBuffer(0);
    try {
      Proteus.message.Envelope.deserialise(empty_buffer);
    } catch (error) {
      expect(error instanceof CBOR.DecodeError).toBe(true);
    }
  });
});
