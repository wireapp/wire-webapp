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

import * as CBOR from '@wireapp/cbor';
import * as Proteus from '@wireapp/proteus';

describe('Envelope', () => {
  const mac_key = new Proteus.derived.MacKey(new Uint8Array(32).fill(1));

  const session_tag = new Proteus.message.SessionTag();

  let identityKey: Proteus.keys.IdentityKey;
  let baseKey: Proteus.keys.PublicKey;
  let ratchetKey: Proteus.keys.PublicKey;

  beforeAll(async () => {
    identityKey = new Proteus.keys.IdentityKey((await Proteus.keys.KeyPair.new()).public_key);
    baseKey = (await Proteus.keys.KeyPair.new()).public_key;
    ratchetKey = (await Proteus.keys.KeyPair.new()).public_key;
  });

  it('encapsulates a CipherMessage', () => {
    const message = new Proteus.message.CipherMessage(session_tag, 42, 3, ratchetKey, new Uint8Array([1, 2, 3, 4, 5]));
    const envelope = new Proteus.message.Envelope(mac_key, message);

    expect(envelope.verify(mac_key)).toBe(true);
  });

  it('encapsulates a PreKeyMessage', () => {
    const msg = new Proteus.message.PreKeyMessage(
      42,
      baseKey,
      identityKey,
      new Proteus.message.CipherMessage(session_tag, 42, 43, ratchetKey, new Uint8Array([1, 2, 3, 4])),
    );

    const envelope = new Proteus.message.Envelope(mac_key, msg);
    expect(envelope.verify(mac_key)).toBe(true);
  });

  it('encodes to and decode from CBOR', () => {
    const msg = new Proteus.message.PreKeyMessage(
      42,
      baseKey,
      identityKey,
      new Proteus.message.CipherMessage(session_tag, 42, 43, ratchetKey, new Uint8Array([1, 2, 3, 4])),
    );

    const envelope = new Proteus.message.Envelope(mac_key, msg);
    expect(envelope.verify(mac_key)).toBe(true);

    const envelopeSerialised = envelope.serialise();
    const envelopeCopy = Proteus.message.Envelope.deserialise(envelopeSerialised);

    expect(envelopeCopy.verify(mac_key)).toBe(true);
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
