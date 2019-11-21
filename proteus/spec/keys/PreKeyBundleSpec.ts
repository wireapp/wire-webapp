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
import * as sodium from 'libsodium-wrappers-sumo';

beforeAll(async () => {
  await sodium.ready;
});

describe('PreKeyBundle', () => {
  it('creates a bundle', async () => {
    const [id_pair, prekey] = await Promise.all([Proteus.keys.IdentityKeyPair.new(), Proteus.keys.PreKey.new(1)]);
    const bundle = Proteus.keys.PreKeyBundle.new(id_pair.public_key, prekey);
    expect(bundle.verify()).toBe(Proteus.keys.PreKeyAuth.UNKNOWN);
  });

  it('creates a valid signed bundle', async () => {
    const [id_pair, prekey] = await Promise.all([Proteus.keys.IdentityKeyPair.new(), Proteus.keys.PreKey.new(1)]);
    const bundle = Proteus.keys.PreKeyBundle.signed(id_pair, prekey);
    expect(bundle.verify()).toBe(Proteus.keys.PreKeyAuth.VALID);
  });

  it('serialises and deserialise an unsigned bundle', async () => {
    const [id_pair, prekey] = await Promise.all([Proteus.keys.IdentityKeyPair.new(), Proteus.keys.PreKey.new(1)]);
    const bundle = Proteus.keys.PreKeyBundle.new(id_pair.public_key, prekey);

    expect(bundle.verify()).toBe(Proteus.keys.PreKeyAuth.UNKNOWN);

    const pkb_bytes = bundle.serialise();
    const pkb_copy = Proteus.keys.PreKeyBundle.deserialise(pkb_bytes);

    expect(pkb_copy.verify()).toBe(Proteus.keys.PreKeyAuth.UNKNOWN);
    expect(pkb_copy.version).toBe(bundle.version);
    expect(pkb_copy.prekey_id).toBe(bundle.prekey_id);
    expect(pkb_copy.public_key.fingerprint()).toBe(bundle.public_key.fingerprint());
    expect(pkb_copy.identity_key.fingerprint()).toBe(bundle.identity_key.fingerprint());
    expect(pkb_copy.signature).toEqual(bundle.signature);
    expect(sodium.to_hex(new Uint8Array(pkb_bytes))).toBe(sodium.to_hex(new Uint8Array(pkb_copy.serialise())));
  });

  it('should serialise and deserialise a signed bundle', async () => {
    const [id_pair, prekey] = await Promise.all([Proteus.keys.IdentityKeyPair.new(), Proteus.keys.PreKey.new(1)]);
    const bundle = Proteus.keys.PreKeyBundle.signed(id_pair, prekey);
    expect(bundle.verify()).toBe(Proteus.keys.PreKeyAuth.VALID);

    const pkb_bytes = bundle.serialise();
    const pkb_copy = Proteus.keys.PreKeyBundle.deserialise(pkb_bytes);

    expect(pkb_copy.verify()).toBe(Proteus.keys.PreKeyAuth.VALID);

    expect(pkb_copy.version).toBe(bundle.version);
    expect(pkb_copy.prekey_id).toBe(bundle.prekey_id);
    expect(pkb_copy.public_key.fingerprint()).toBe(bundle.public_key.fingerprint());
    expect(pkb_copy.identity_key.fingerprint()).toBe(bundle.identity_key.fingerprint());
    expect(sodium.to_hex(pkb_copy.signature!)).toBe(sodium.to_hex(bundle.signature!));
    expect(sodium.to_hex(new Uint8Array(pkb_bytes))).toBe(sodium.to_hex(new Uint8Array(pkb_copy.serialise())));
  });

  it('should generate a serialised JSON format', async () => {
    const pre_key_id = 72;

    const [identity_key_pair, pre_key] = await Promise.all([
      Proteus.keys.IdentityKeyPair.new(),
      Proteus.keys.PreKey.new(pre_key_id),
    ]);
    const public_identity_key = identity_key_pair.public_key;
    const pre_key_bundle = Proteus.keys.PreKeyBundle.new(public_identity_key, pre_key);
    const serialised_pre_key_bundle_json = pre_key_bundle.serialised_json();

    expect(serialised_pre_key_bundle_json.id).toBe(pre_key_id);

    const serialised_array_buffer_view = sodium.from_base64(
      serialised_pre_key_bundle_json.key,
      sodium.base64_variants.ORIGINAL,
    );
    const serialised_array_buffer = serialised_array_buffer_view.buffer;
    const deserialised_pre_key_bundle = Proteus.keys.PreKeyBundle.deserialise(serialised_array_buffer);

    expect(deserialised_pre_key_bundle.public_key).toEqual(pre_key_bundle.public_key);
  });
});
