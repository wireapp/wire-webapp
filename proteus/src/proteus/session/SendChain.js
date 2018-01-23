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

const ClassUtil = require('../util/ClassUtil');
const DontCallConstructor = require('../errors/DontCallConstructor');
const TypeUtil = require('../util/TypeUtil');

const ChainKey = require('./ChainKey');
const KeyPair = require('../keys/KeyPair');

/** @module session */

/**
 * @class SendChain
 * @throws {DontCallConstructor}
 */
class SendChain {
  constructor() {
    /** @type {ChainKey} */
    this.chain_key = undefined;
    /** @type {keys.KeyPair} */
    this.ratchet_key = undefined;

    throw new DontCallConstructor(this);
  }

  static new(chain_key, keypair) {
    TypeUtil.assert_is_instance(ChainKey, chain_key);
    TypeUtil.assert_is_instance(KeyPair, keypair);

    const sc = ClassUtil.new_instance(SendChain);
    sc.chain_key = chain_key;
    sc.ratchet_key = keypair;
    return sc;
  }

  /**
   * @param {!CBOR.Encoder} encoder
   * @returns {CBOR.Encoder}
   */
  encode(encoder) {
    encoder.object(2);
    encoder.u8(0);
    this.chain_key.encode(encoder);
    encoder.u8(1);
    return this.ratchet_key.encode(encoder);
  }

  /**
   * @param {!CBOR.Decoder} decoder
   * @returns {SendChain}
   */
  static decode(decoder) {
    TypeUtil.assert_is_instance(CBOR.Decoder, decoder);
    const self = ClassUtil.new_instance(SendChain);
    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.chain_key = ChainKey.decode(decoder);
          break;
        case 1:
          self.ratchet_key = KeyPair.decode(decoder);
          break;
        default:
          decoder.skip();
      }
    }
    TypeUtil.assert_is_instance(ChainKey, self.chain_key);
    TypeUtil.assert_is_instance(KeyPair, self.ratchet_key);
    return self;
  }
}

module.exports = SendChain;
