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

/* eslint no-magic-numbers: "off" */

const CBOR = require('@wireapp/cbor');
const ed2curve = require('ed2curve');
const sodium = require('libsodium-wrappers-sumo');

const ClassUtil = require('../util/ClassUtil');
const DontCallConstructor = require('../errors/DontCallConstructor');
const TypeUtil = require('../util/TypeUtil');

const PublicKey = require('./PublicKey');
const SecretKey = require('./SecretKey');

/** @module keys */

/**
 * Construct an ephemeral key pair.
 * @class KeyPair
 * @throws {DontCallConstructor}
 */
class KeyPair {
  constructor() {
    /** @type {keys.PublicKey} */
    this.public_key = undefined;
    /** @type {SecretKey} */
    this.secret_key = undefined;

    throw new DontCallConstructor(this);
  }

  /** @returns {KeyPair} - `this` */
  static new() {
    const ed25519_key_pair = sodium.crypto_sign_keypair();

    const kp = ClassUtil.new_instance(KeyPair);
    kp.secret_key = KeyPair.prototype._construct_private_key(ed25519_key_pair);
    kp.public_key = KeyPair.prototype._construct_public_key(ed25519_key_pair);

    return kp;
  }

  /**
   * @description Ed25519 keys can be converted to Curve25519 keys, so that the same key pair can be
   * used both for authenticated encryption (crypto_box) and for signatures (crypto_sign).
   * @param {!Uint8Array} ed25519_key_pair - Key pair based on Edwards-curve (Ed25519)
   * @returns {keys.SecretKey} - Constructed private key
   * @private
   * @see https://download.libsodium.org/doc/advanced/ed25519-curve25519.html
   */
  _construct_private_key(ed25519_key_pair) {
    const sk_ed25519 = ed25519_key_pair.privateKey;
    const sk_curve25519 = ed2curve.convertSecretKey(sk_ed25519);
    return SecretKey.new(sk_ed25519, sk_curve25519);
  }

  /**
   * @typedef {Object} libsodium_keypair
   * @param {!Uint8Array} publicKey
   * @param {!Uint8Array} privateKey
   * @param {!string} keyType
   */
  /**
   * @param {!libsodium_keypair} ed25519_key_pair - Key pair based on Edwards-curve (Ed25519)
   * @private
   * @returns {keys.PublicKey} - Constructed public key
   */
  _construct_public_key(ed25519_key_pair) {
    const pk_ed25519 = ed25519_key_pair.publicKey;
    const pk_curve25519 = ed2curve.convertPublicKey(pk_ed25519);
    return PublicKey.new(pk_ed25519, pk_curve25519);
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(2);

    encoder.u8(0);
    this.secret_key.encode(encoder);

    encoder.u8(1);
    return this.public_key.encode(encoder);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {KeyPair}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);

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

    TypeUtil.assert_is_instance(SecretKey, self.secret_key);
    TypeUtil.assert_is_instance(PublicKey, self.public_key);

    return self;
  }
}

module.exports = KeyPair;
