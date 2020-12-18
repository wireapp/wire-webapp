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

import {IdentityKey, PublicKey} from '../keys/';
import {DecodeError, InputError} from '../errors/';
import {Message} from './Message';
import {CipherMessage} from './CipherMessage';

export class PreKeyMessage extends Message {
  readonly base_key: PublicKey;
  readonly identity_key: IdentityKey;
  readonly message: CipherMessage;
  readonly prekey_id: number;
  private static readonly propertiesLength = 4;

  constructor(prekeyId: number, baseKey: PublicKey, identityKey: IdentityKey, message: CipherMessage) {
    super();
    this.prekey_id = prekeyId;
    this.base_key = baseKey;
    this.identity_key = identityKey;
    this.message = message;
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(PreKeyMessage.propertiesLength);
    encoder.u8(0);
    encoder.u16(this.prekey_id);
    encoder.u8(1);
    this.base_key.encode(encoder);
    encoder.u8(2);
    this.identity_key.encode(encoder);
    encoder.u8(3);
    return this.message.encode(encoder);
  }

  static decode(decoder: CBOR.Decoder): PreKeyMessage {
    const propertiesLength = decoder.object();
    if (propertiesLength === PreKeyMessage.propertiesLength) {
      decoder.u8();
      const prekeyId = Number(decoder.u16());

      decoder.u8();
      const baseKey = PublicKey.decode(decoder);

      decoder.u8();
      const identityKey = IdentityKey.decode(decoder);

      decoder.u8();
      const message = CipherMessage.decode(decoder);

      if (!isNaN(prekeyId) && baseKey && identityKey && message) {
        return new PreKeyMessage(prekeyId, baseKey, identityKey, message);
      }
      throw new InputError.TypeError(`Given PreKeyMessage doesn't match expected signature.`, InputError.CODE.CASE_406);
    }
    throw new DecodeError(`Unexpected number of properties: "${propertiesLength}"`);
  }
}
