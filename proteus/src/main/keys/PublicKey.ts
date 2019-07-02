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
import * as ed2curve from 'ed2curve';
import * as sodium from 'libsodium-wrappers-sumo';

import {InputError} from '../errors/InputError';
import * as ClassUtil from '../util/ClassUtil';

export class PublicKey {
  static new(pub_edward: Uint8Array, pub_curve: Uint8Array): PublicKey {
    const pk = ClassUtil.new_instance(PublicKey);

    pk.pub_edward = pub_edward;
    pk.pub_curve = pub_curve;
    return pk;
  }

  static decode(decoder: CBOR.Decoder): PublicKey {
    const self = ClassUtil.new_instance(PublicKey);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.pub_edward = new Uint8Array(decoder.bytes());
          break;
        default:
          decoder.skip();
      }
    }

    const pub_curve = ed2curve.convertPublicKey(self.pub_edward);
    if (pub_curve) {
      self.pub_curve = pub_curve;
      return self;
    }
    throw new InputError.ConversionError('Could not convert private key with ed2curve.', 409);
  }
  pub_edward: Uint8Array;
  pub_curve: Uint8Array;

  constructor() {
    this.pub_edward = new Uint8Array([]);
    this.pub_curve = new Uint8Array([]);
  }

  /**
   * This function can be used to verify a message signature.
   *
   * @param signature The signature to verify
   * @param message The message from which the signature was computed.
   * @returns `true` if the signature is valid, `false` otherwise.
   */
  verify(signature: Uint8Array, message: Uint8Array): boolean {
    return sodium.crypto_sign_verify_detached(signature, message, this.pub_edward);
  }

  fingerprint(): string {
    return sodium.to_hex(this.pub_edward);
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(1);
    encoder.u8(0);
    return encoder.bytes(this.pub_edward);
  }
}
