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

import {InputError} from '../errors/InputError';
import * as ArrayUtil from '../util/ArrayUtil';
import {PublicKey} from './PublicKey';
import {DecodeError} from '../errors';

export class SecretKey {
  readonly sec_curve: Uint8Array;
  readonly sec_edward: Uint8Array;
  private static readonly propertiesLength = 1;

  constructor(secEdward: Uint8Array, secCurve: Uint8Array) {
    this.sec_edward = secEdward;
    this.sec_curve = secCurve;
  }

  /**
   * This function can be used to compute a message signature.
   * @param message Message to be signed
   * @returns A message signature
   */
  sign(message: Uint8Array | string): Uint8Array {
    return sodium.crypto_sign_detached(message, this.sec_edward);
  }

  /**
   * This function can be used to compute a shared secret given a user's secret key and another
   * user's public key.
   * @param publicKey Another user's public key
   * @returns Array buffer view of the computed shared secret
   */
  shared_secret(publicKey: PublicKey): Uint8Array {
    const sharedSecret = sodium.crypto_scalarmult(this.sec_curve, publicKey.pub_curve);

    ArrayUtil.assert_is_not_zeros(sharedSecret);

    return sharedSecret;
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(SecretKey.propertiesLength);
    encoder.u8(0);
    return encoder.bytes(this.sec_edward);
  }

  static decode(decoder: CBOR.Decoder): SecretKey {
    const propertiesLength = decoder.object();
    if (propertiesLength === SecretKey.propertiesLength) {
      decoder.u8();
      const secEdward = new Uint8Array(decoder.bytes());

      try {
        const secCurve = sodium.crypto_sign_ed25519_sk_to_curve25519(secEdward);
        return new SecretKey(secEdward, secCurve);
      } catch (error) {
        throw new InputError.ConversionError('Could not convert secret key with libsodium.', 408);
      }
    }

    throw new DecodeError(`Unexpected number of properties: "${propertiesLength}"`);
  }
}
