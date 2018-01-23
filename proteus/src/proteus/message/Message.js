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

const DontCallConstructor = require('../errors/DontCallConstructor');
const TypeUtil = require('../util/TypeUtil');

const DecodeError = require('../errors/DecodeError');

/** @module message */

/**
 * @class Message
 * @throws {DontCallConstructor}
 */
class Message {
  constructor() {
    throw new DontCallConstructor(this);
  }

  /** @returns {ArrayBuffer} */
  serialise() {
    const encoder = new CBOR.Encoder();
    if (this instanceof CipherMessage) {
      encoder.u8(1);
    } else if (this instanceof PreKeyMessage) {
      encoder.u8(2);
    } else {
      throw new TypeError('Unexpected message type', 9);
    }

    this.encode(encoder);
    return encoder.get_buffer();
  }

  /**
   * @param {!ArrayBuffer} buf
   * @returns {message.CipherMessage|message.PreKeyMessage}
   */
  static deserialise(buf) {
    TypeUtil.assert_is_instance(ArrayBuffer, buf);

    const decoder = new CBOR.Decoder(buf);

    switch (decoder.u8()) {
      case 1:
        return CipherMessage.decode(decoder);
      case 2:
        return PreKeyMessage.decode(decoder);
      default:
        throw new DecodeError.InvalidType('Unrecognised message type', DecodeError.CODE.CASE_302);
    }
  }
}

module.exports = Message;

// these require lines have to come after the Message definition because otherwise
// it creates a circular dependency with the message subtypes
const CipherMessage = require('./CipherMessage');
const PreKeyMessage = require('./PreKeyMessage');
