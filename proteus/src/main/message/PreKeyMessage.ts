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

import {IdentityKey} from '../keys/IdentityKey';
import {PublicKey} from '../keys/PublicKey';
import * as ClassUtil from '../util/ClassUtil';

import {InputError} from '../errors/InputError';
import {CipherMessage} from './CipherMessage';
import {Message} from './Message';

class PreKeyMessage extends Message {
  base_key: PublicKey;
  identity_key: IdentityKey;
  message: CipherMessage;
  prekey_id: number;

  constructor() {
    super();
    this.base_key = new PublicKey();
    this.identity_key = new IdentityKey();
    this.message = new CipherMessage();
    this.prekey_id = -1;
  }

  static new(prekey_id: number, base_key: PublicKey, identity_key: IdentityKey, message: CipherMessage): PreKeyMessage {
    const pkm = ClassUtil.new_instance(PreKeyMessage);

    pkm.prekey_id = prekey_id;
    pkm.base_key = base_key;
    pkm.identity_key = identity_key;
    pkm.message = message;

    Object.freeze(pkm);
    return pkm;
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(4);
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
    let prekey_id = null;
    let base_key = null;
    let identity_key = null;
    let message = null;

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          prekey_id = decoder.u16();
          break;
        case 1:
          base_key = PublicKey.decode(decoder);
          break;
        case 2:
          identity_key = IdentityKey.decode(decoder);
          break;
        case 3:
          message = CipherMessage.decode(decoder);
          break;
        default:
          decoder.skip();
      }
    }

    prekey_id = Number(prekey_id);

    if (!isNaN(prekey_id) && base_key && identity_key && message) {
      return PreKeyMessage.new(prekey_id, base_key, identity_key, message);
    } else {
      throw new InputError.TypeError(`Given PreKeyMessage doesn't match expected signature.`, InputError.CODE.CASE_406);
    }
  }
}

export {PreKeyMessage};
