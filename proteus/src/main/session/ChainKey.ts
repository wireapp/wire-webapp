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

import {DerivedSecrets} from '../derived/DerivedSecrets';
import {MacKey} from '../derived/MacKey';
import * as ClassUtil from '../util/ClassUtil';
import {MessageKeys} from './MessageKeys';

class ChainKey {
  idx: number;
  key: MacKey;

  constructor() {
    this.idx = -1;
    this.key = new MacKey(new Uint8Array([]));
  }

  static from_mac_key(key: MacKey, counter: number): ChainKey {
    const ck = ClassUtil.new_instance(ChainKey);
    ck.key = key;
    ck.idx = counter;
    return ck;
  }

  next(): ChainKey {
    const ck = ClassUtil.new_instance(ChainKey);
    ck.key = new MacKey(this.key.sign('1'));
    ck.idx = this.idx + 1;
    return ck;
  }

  message_keys(): MessageKeys {
    const base = this.key.sign('0');
    const derived_secrets = DerivedSecrets.kdf_without_salt(base, 'hash_ratchet');
    return MessageKeys.new(derived_secrets.cipher_key, derived_secrets.mac_key, this.idx);
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(2);
    encoder.u8(0);
    this.key.encode(encoder);
    encoder.u8(1);
    return encoder.u32(this.idx);
  }

  static decode(decoder: CBOR.Decoder): ChainKey {
    const self = ClassUtil.new_instance(ChainKey);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.key = MacKey.decode(decoder);
          break;
        case 1:
          self.idx = decoder.u32();
          break;
        default:
          decoder.skip();
      }
    }

    return self;
  }
}

export {ChainKey};
