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

import * as ClassUtil from '../util/ClassUtil';

import {InputError} from '../errors/InputError';
import * as ArrayUtil from '../util/ArrayUtil';
import {PublicKey} from './PublicKey';

class SecretKey {
  sec_curve: Uint8Array;
  sec_edward: Uint8Array;

  constructor() {
    this.sec_curve = new Uint8Array([]);
    this.sec_edward = new Uint8Array([]);
  }

  static new(sec_edward: Uint8Array, sec_curve: Uint8Array): SecretKey {
    const sk = ClassUtil.new_instance(SecretKey);

    sk.sec_edward = sec_edward;
    sk.sec_curve = sec_curve;
    return sk;
  }

  /**
   * This function can be used to compute a message signature.
   * @param message Message to be signed
   * @returns A message signature
   */
  sign(message: Uint8Array): Uint8Array {
    return sodium.crypto_sign_detached(message, this.sec_edward);
  }

  /**
   * This function can be used to compute a shared secret given a user's secret key and another
   * user's public key.
   * @param public_key Another user's public key
   * @returns Array buffer view of the computed shared secret
   */
  shared_secret(public_key: PublicKey): Uint8Array {
    const shared_secret = sodium.crypto_scalarmult(this.sec_curve, public_key.pub_curve);

    ArrayUtil.assert_is_not_zeros(shared_secret);

    return shared_secret;
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(1);
    encoder.u8(0);
    return encoder.bytes(this.sec_edward);
  }

  static decode(decoder: CBOR.Decoder): SecretKey {
    const self = ClassUtil.new_instance(SecretKey);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.sec_edward = new Uint8Array(decoder.bytes());
          break;
        default:
          decoder.skip();
      }
    }

    const sec_curve = ed2curve.convertSecretKey(self.sec_edward);
    if (sec_curve) {
      self.sec_curve = sec_curve;
      return self;
    }
    throw new InputError.ConversionError('Could not convert public key with ed2curve.', 408);
  }
}

export {SecretKey};
