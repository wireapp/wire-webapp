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

const CBOR = require('@wireapp/cbor');
const ed2curve = require('ed2curve');
const sodium = require('libsodium-wrappers-sumo');

const ClassUtil = require('../util/ClassUtil');
const DontCallConstructor = require('../errors/DontCallConstructor');
const PublicKey = require('./PublicKey');
const TypeUtil = require('../util/TypeUtil');

/** @module keys */

/**
 * @class SecretKey
 * @throws {DontCallConstructor}
 */
class SecretKey {
  constructor() {
    /** @type {Uint8Array} */
    this.sec_edward = undefined;
    /** @type {Uint8Array} */
    this.sec_curve = undefined;

    throw new DontCallConstructor(this);
  }

  /**
   * @param {!Uint8Array} sec_edward
   * @param {!Uint8Array} sec_curve
   * @returns {SecretKey} - `this`
   */
  static new(sec_edward, sec_curve) {
    TypeUtil.assert_is_instance(Uint8Array, sec_edward);
    TypeUtil.assert_is_instance(Uint8Array, sec_curve);

    const sk = ClassUtil.new_instance(SecretKey);

    sk.sec_edward = sec_edward;
    sk.sec_curve = sec_curve;
    return sk;
  }

  /**
   * This function can be used to compute a message signature.
   * @param {!string} message - Message to be signed
   * @returns {Uint8Array} - A message signature
   */
  sign(message) {
    return sodium.crypto_sign_detached(message, this.sec_edward);
  }

  /**
   * This function can be used to compute a shared secret given a user's secret key and another
   * user's public key.
   * @param {!keys.PublicKey} public_key - Another user's public key
   * @returns {Uint8Array} - Array buffer view of the computed shared secret
   */
  shared_secret(public_key) {
    TypeUtil.assert_is_instance(PublicKey, public_key);

    return sodium.crypto_scalarmult(this.sec_curve, public_key.pub_curve);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(1);
    encoder.u8(0);
    return encoder.bytes(this.sec_edward);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {SecretKey}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

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

    TypeUtil.assert_is_instance(Uint8Array, self.sec_edward);

    self.sec_curve = ed2curve.convertSecretKey(self.sec_edward);
    return self;
  }
}

module.exports = SecretKey;
