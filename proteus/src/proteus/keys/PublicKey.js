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

const CBOR = require('wire-webapp-cbor');
const ed2curve = require('ed2curve');
const sodium = require('libsodium-wrappers-sumo');

const ClassUtil = require('../util/ClassUtil');
const DontCallConstructor = require('../errors/DontCallConstructor');
const TypeUtil = require('../util/TypeUtil');

/** @module keys */

/**
 * @class PublicKey
 * @throws {DontCallConstructor}
 */
class PublicKey {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!Uint8Array} pub_edward
   * @param {!Uint8Array} pub_curve
   * @returns {PublicKey} - `this`
   */
  static new(pub_edward, pub_curve) {
    TypeUtil.assert_is_instance(Uint8Array, pub_edward);
    TypeUtil.assert_is_instance(Uint8Array, pub_curve);

    /** @type {PublicKey} */
    const pk = ClassUtil.new_instance(PublicKey);

    /** @type {Uint8Array} */
    pk.pub_edward = pub_edward;
    /** @type {Uint8Array} */
    pk.pub_curve = pub_curve;
    return pk;
  }

  /**
   * This function can be used to verify a message signature.
   *
   * @param {!Uint8Array} signature - The signature to verify
   * @param {!string} message - The message from which the signature was computed.
   * @returns {boolean} - `true` if the signature is valid, `false` otherwise.
   */
  verify(signature, message) {
    TypeUtil.assert_is_instance(Uint8Array, signature);
    return sodium.crypto_sign_verify_detached(signature, message, this.pub_edward);
  }

  /** @returns {string} */
  fingerprint() {
    return sodium.to_hex(this.pub_edward);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(1);
    encoder.u8(0);
    return encoder.bytes(this.pub_edward);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {PublicKey}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

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

    TypeUtil.assert_is_instance(Uint8Array, self.pub_edward);

    self.pub_curve = ed2curve.convertPublicKey(self.pub_edward);
    return self;
  }
}

module.exports = PublicKey;
