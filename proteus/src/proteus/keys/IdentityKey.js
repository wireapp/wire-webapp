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
const sodium = require('libsodium-wrappers-sumo');

const ClassUtil = require('../util/ClassUtil');
const DontCallConstructor = require('../errors/DontCallConstructor');
const TypeUtil = require('../util/TypeUtil');

const PublicKey = require('./PublicKey');

/** @module keys */

/**
 * Construct a long-term identity key pair.
 * @classdesc Every client has a long-term identity key pair.
 * Long-term identity keys are used to initialise "sessions" with other clients (triple DH).
 * @throws {DontCallConstructor}
 */
class IdentityKey {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /**
   * @param {!IdentityKey} public_key
   * @returns {IdentityKey} - `this`
   */
  static new(public_key) {
    TypeUtil.assert_is_instance(PublicKey, public_key);

    const key = ClassUtil.new_instance(IdentityKey);
    key.public_key = public_key;
    return key;
  }

  /** @returns {string} */
  fingerprint() {
    return this.public_key.fingerprint();
  }

  /** @returns {string} */
  toString() {
    return sodium.to_hex(this.public_key);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(1);
    encoder.u8(0);
    return this.public_key.encode(encoder);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {IdentityKey}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

    let public_key = null;

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          public_key = PublicKey.decode(decoder);
          break;
        default:
          decoder.skip();
      }
    }

    return IdentityKey.new(public_key);
  }
}

module.exports = IdentityKey;
