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
import * as sodium from 'libsodium-wrappers-sumo';

import {IdentityKey, IdentityKeyPair, PreKey, PreKeyAuth, PublicKey} from './';
import {DecodeError} from '../errors';

export interface SerialisedJSON {
  id: number;
  key: string;
}

export class PreKeyBundle {
  readonly identity_key: IdentityKey;
  readonly prekey_id: number;
  readonly public_key: PublicKey;
  readonly signature?: Uint8Array | null;
  readonly version: number;
  private static readonly propertiesLength = 5;

  constructor(publicIdentityKey: IdentityKey, preKey: PreKey);
  constructor(
    publicIdentityKey: IdentityKey,
    preKeyId: number,
    publicKey: PublicKey,
    signature?: Uint8Array | null,
    version?: number,
  );
  constructor(
    publicIdentityKey: IdentityKey,
    preKeyIdOrPreKey: number | PreKey,
    publicKeyOrSignature?: PublicKey | Uint8Array | null,
    signatureOrVersion: Uint8Array | number | null = null,
    versionOrNone: number = 1,
  ) {
    this.identity_key = publicIdentityKey;

    if (typeof preKeyIdOrPreKey === 'number') {
      this.prekey_id = preKeyIdOrPreKey;
      this.public_key = publicKeyOrSignature as PublicKey;
      this.signature = signatureOrVersion as Uint8Array | null;
      this.version = versionOrNone;
    } else {
      this.prekey_id = preKeyIdOrPreKey.key_id;
      this.public_key = preKeyIdOrPreKey.key_pair.public_key;
      this.signature = null;
      this.version = 1;
    }
  }

  static signed(identityPair: IdentityKeyPair, prekey: PreKey): PreKeyBundle {
    const ratchetKey = prekey.key_pair.public_key;
    const signature = identityPair.secret_key.sign(ratchetKey.pub_edward);

    return new PreKeyBundle(identityPair.public_key, prekey.key_id, prekey.key_pair.public_key, signature);
  }

  verify(): PreKeyAuth {
    if (!this.signature) {
      return PreKeyAuth.UNKNOWN;
    }

    if (this.identity_key.public_key.verify(this.signature, this.public_key.pub_edward)) {
      return PreKeyAuth.VALID;
    }

    return PreKeyAuth.INVALID;
  }

  serialise(): ArrayBuffer {
    const encoder = new CBOR.Encoder();
    this.encode(encoder);
    return encoder.get_buffer();
  }

  serialised_json(): SerialisedJSON {
    return {
      id: this.prekey_id,
      key: sodium.to_base64(new Uint8Array(this.serialise()), sodium.base64_variants.ORIGINAL),
    };
  }

  static deserialise(buf: ArrayBuffer): PreKeyBundle {
    return PreKeyBundle.decode(new CBOR.Decoder(buf));
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(PreKeyBundle.propertiesLength);
    encoder.u8(0);
    encoder.u8(this.version);
    encoder.u8(1);
    encoder.u16(this.prekey_id);
    encoder.u8(2);
    this.public_key.encode(encoder);
    encoder.u8(3);
    this.identity_key.encode(encoder);

    encoder.u8(4);

    return this.signature ? encoder.bytes(this.signature) : encoder.null();
  }

  static decode(decoder: CBOR.Decoder): PreKeyBundle {
    const propertiesLength = decoder.object();
    if (propertiesLength === PreKeyBundle.propertiesLength) {
      decoder.u8();
      const version = decoder.u8();

      decoder.u8();
      const preKeyId = decoder.u16();

      decoder.u8();
      const publicKey = PublicKey.decode(decoder);

      decoder.u8();
      const identityKey = IdentityKey.decode(decoder);

      decoder.u8();
      const signature = decoder.optional(() => new Uint8Array(decoder.bytes()));

      return new PreKeyBundle(identityKey, preKeyId, publicKey, signature, version);
    }

    throw new DecodeError(`Unexpected number of properties: "${propertiesLength}"`);
  }
}
