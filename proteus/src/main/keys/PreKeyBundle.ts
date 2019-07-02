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

import * as ClassUtil from '../util/ClassUtil';
import {IdentityKey} from './IdentityKey';
import {IdentityKeyPair} from './IdentityKeyPair';
import {PreKey} from './PreKey';
import {PreKeyAuth} from './PreKeyAuth';
import {PublicKey} from './PublicKey';

export interface SerialisedJSON {
  id: number;
  key: string;
}

export class PreKeyBundle {
  static new(public_identity_key: IdentityKey, prekey: PreKey): PreKeyBundle {
    const bundle = ClassUtil.new_instance(PreKeyBundle);

    bundle.version = 1;
    bundle.prekey_id = prekey.key_id;
    bundle.public_key = prekey.key_pair.public_key;
    bundle.identity_key = public_identity_key;
    bundle.signature = null;

    return bundle;
  }

  static signed(identity_pair: IdentityKeyPair, prekey: PreKey): PreKeyBundle {
    const ratchet_key = prekey.key_pair.public_key;
    const signature = identity_pair.secret_key.sign(ratchet_key.pub_edward);

    const bundle = ClassUtil.new_instance(PreKeyBundle);

    bundle.version = 1;
    bundle.prekey_id = prekey.key_id;
    bundle.public_key = ratchet_key;
    bundle.identity_key = identity_pair.public_key;
    bundle.signature = signature;

    return bundle;
  }

  static deserialise(buf: ArrayBuffer): PreKeyBundle {
    return PreKeyBundle.decode(new CBOR.Decoder(buf));
  }

  static decode(decoder: CBOR.Decoder): PreKeyBundle {
    const self = ClassUtil.new_instance(PreKeyBundle);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.version = decoder.u8();
          break;
        case 1:
          self.prekey_id = decoder.u16();
          break;
        case 2:
          self.public_key = PublicKey.decode(decoder);
          break;
        case 3:
          self.identity_key = IdentityKey.decode(decoder);
          break;
        case 4:
          self.signature = decoder.optional(() => new Uint8Array(decoder.bytes()));
          break;
        default:
          decoder.skip();
      }
    }

    return self;
  }
  version: number;
  prekey_id: number;
  public_key: PublicKey;
  identity_key: IdentityKey;
  signature: Uint8Array | null | undefined;

  constructor() {
    this.version = -1;
    this.prekey_id = -1;
    this.public_key = new PublicKey();
    this.identity_key = new IdentityKey();
    this.signature = null;
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

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(5);
    encoder.u8(0);
    encoder.u8(this.version);
    encoder.u8(1);
    encoder.u16(this.prekey_id);
    encoder.u8(2);
    this.public_key.encode(encoder);
    encoder.u8(3);
    this.identity_key.encode(encoder);

    encoder.u8(4);
    if (!this.signature) {
      return encoder.null();
    }
    return encoder.bytes(this.signature);
  }
}
