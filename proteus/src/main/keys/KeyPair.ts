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
import * as _sodium from 'libsodium-wrappers-sumo';

import * as ClassUtil from '../util/ClassUtil';
import {PublicKey} from './PublicKey';
import {SecretKey} from './SecretKey';

import {InputError} from '../errors/InputError';

/** Construct an ephemeral key pair. */
export class KeyPair {
  static async new(): Promise<KeyPair> {
    await _sodium.ready;
    const sodium = _sodium;

    const ed25519_key_pair = sodium.crypto_sign_keypair();

    const kp = ClassUtil.new_instance(KeyPair);
    kp.secret_key = KeyPair.prototype._construct_private_key(ed25519_key_pair);
    kp.public_key = KeyPair.prototype._construct_public_key(ed25519_key_pair);

    return kp;
  }

  static decode(decoder: CBOR.Decoder): KeyPair {
    const self = ClassUtil.new_instance(KeyPair);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.secret_key = SecretKey.decode(decoder);
          break;
        case 1:
          self.public_key = PublicKey.decode(decoder);
          break;
        default:
          decoder.skip();
      }
    }

    return self;
  }
  public_key: PublicKey;
  secret_key: SecretKey;

  constructor() {
    this.public_key = new PublicKey();
    this.secret_key = new SecretKey();
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(2);

    encoder.u8(0);
    this.secret_key.encode(encoder);

    encoder.u8(1);
    return this.public_key.encode(encoder);
  }

  /**
   * Ed25519 keys can be converted to Curve25519 keys, so that the same key pair can be
   * used both for authenticated encryption (`crypto_box`) and for signatures (`crypto_sign`).
   * @param ed25519_key_pair Key pair based on Edwards-curve (Ed25519)
   * @returns Constructed private key
   * @see https://download.libsodium.org/doc/advanced/ed25519-curve25519.html
   */
  private _construct_private_key(ed25519_key_pair: _sodium.KeyPair): SecretKey {
    const sk_ed25519 = ed25519_key_pair.privateKey;
    const sk_curve25519 = ed2curve.convertSecretKey(sk_ed25519);
    if (sk_curve25519) {
      return SecretKey.new(sk_ed25519, sk_curve25519);
    }
    throw new InputError.ConversionError('Could not convert private key with ed2curve.', 409);
  }

  /**
   * @param ed25519_key_pair Key pair based on Edwards-curve (Ed25519)
   * @returns Constructed public key
   */
  private _construct_public_key(ed25519_key_pair: _sodium.KeyPair): PublicKey {
    const pk_ed25519 = ed25519_key_pair.publicKey;
    const pk_curve25519 = ed2curve.convertPublicKey(pk_ed25519);
    if (pk_curve25519) {
      return PublicKey.new(pk_ed25519, pk_curve25519);
    }
    throw new InputError.ConversionError('Could not convert public key with ed2curve.', 408);
  }
}
