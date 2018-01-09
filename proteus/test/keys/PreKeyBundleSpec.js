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

describe('PreKeyBundle', () => {
  it('should create a bundle', () => {
    const id_pair = Proteus.keys.IdentityKeyPair.new();
    const prekey = Proteus.keys.PreKey.new(1);
    const bundle = Proteus.keys.PreKeyBundle.new(id_pair.public_key, prekey);

    assert(bundle.verify() === Proteus.keys.PreKeyAuth.UNKNOWN);
  });

  it('should create a valid signed bundle', () => {
    const id_pair = Proteus.keys.IdentityKeyPair.new();
    const prekey = Proteus.keys.PreKey.new(1);
    const bundle = Proteus.keys.PreKeyBundle.signed(id_pair, prekey);

    assert(bundle.verify() === Proteus.keys.PreKeyAuth.VALID);
  });

  it('should serialise and deserialise a unsigned bundle', () => {
    const id_pair = Proteus.keys.IdentityKeyPair.new();
    const prekey = Proteus.keys.PreKey.new(1);
    const bundle = Proteus.keys.PreKeyBundle.new(id_pair.public_key, prekey);

    assert(bundle.verify() === Proteus.keys.PreKeyAuth.UNKNOWN);

    const pkb_bytes = bundle.serialise();
    const pkb_copy = Proteus.keys.PreKeyBundle.deserialise(pkb_bytes);

    assert(pkb_copy.verify() === Proteus.keys.PreKeyAuth.UNKNOWN);

    assert(pkb_copy.version === bundle.version);
    assert(pkb_copy.prekey_id === bundle.prekey_id);
    assert(pkb_copy.public_key.fingerprint() === bundle.public_key.fingerprint());
    assert(pkb_copy.identity_key.fingerprint() === bundle.identity_key.fingerprint());
    assert(pkb_copy.signature === bundle.signature);

    assert(sodium.to_hex(new Uint8Array(pkb_bytes)) === sodium.to_hex(new Uint8Array(pkb_copy.serialise())));
  });

  it('should serialise and deserialise a signed bundle', () => {
    const id_pair = Proteus.keys.IdentityKeyPair.new();
    const prekey = Proteus.keys.PreKey.new(1);
    const bundle = Proteus.keys.PreKeyBundle.signed(id_pair, prekey);

    assert(bundle.verify() === Proteus.keys.PreKeyAuth.VALID);

    const pkb_bytes = bundle.serialise();
    const pkb_copy = Proteus.keys.PreKeyBundle.deserialise(pkb_bytes);

    assert(pkb_copy.verify() === Proteus.keys.PreKeyAuth.VALID);

    assert(pkb_copy.version === bundle.version);
    assert(pkb_copy.prekey_id === bundle.prekey_id);
    assert(pkb_copy.public_key.fingerprint() === bundle.public_key.fingerprint());
    assert(pkb_copy.identity_key.fingerprint() === bundle.identity_key.fingerprint());
    assert(sodium.to_hex(pkb_copy.signature) === sodium.to_hex(bundle.signature));

    assert(sodium.to_hex(new Uint8Array(pkb_bytes)) === sodium.to_hex(new Uint8Array(pkb_copy.serialise())));
  });

  it('should generate a serialised JSON format', () => {
    const identity_key_pair = Proteus.keys.IdentityKeyPair.new();
    const pre_key_id = 72;
    const pre_key = Proteus.keys.PreKey.new(pre_key_id);
    const public_identity_key = identity_key_pair.public_key;
    const pre_key_bundle = Proteus.keys.PreKeyBundle.new(public_identity_key, pre_key);
    const serialised_pre_key_bundle_json = pre_key_bundle.serialised_json();

    assert.strictEqual(serialised_pre_key_bundle_json.id, pre_key_id);

    const serialised_array_buffer_view = sodium.from_base64(serialised_pre_key_bundle_json.key);
    const serialised_array_buffer = serialised_array_buffer_view.buffer;
    const deserialised_pre_key_bundle = Proteus.keys.PreKeyBundle.deserialise(serialised_array_buffer);

    assert.deepEqual(deserialised_pre_key_bundle.public_key, pre_key_bundle.public_key);
  });
});
