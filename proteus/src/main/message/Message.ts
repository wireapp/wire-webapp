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
import {DecodeError} from '../errors/DecodeError';

class Message {
  constructor() {}

  serialise(): ArrayBuffer {
    const encoder = new CBOR.Encoder();
    if (this instanceof CipherMessage) {
      encoder.u8(1);
    } else if (this instanceof PreKeyMessage) {
      encoder.u8(2);
    } else {
      throw new TypeError('Unexpected message type');
    }

    this.encode(encoder);
    return encoder.get_buffer();
  }

  static deserialise(buf: ArrayBuffer): CipherMessage | PreKeyMessage {
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

export {Message};

// these require lines have to come after the Message definition because otherwise
// it creates a circular dependency with the message subtypes
import {CipherMessage} from './CipherMessage';
import {PreKeyMessage} from './PreKeyMessage';
