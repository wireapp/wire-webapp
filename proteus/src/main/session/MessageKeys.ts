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

import {CipherKey} from '../derived/CipherKey';
import {MacKey} from '../derived/MacKey';
import * as ClassUtil from '../util/ClassUtil';

class MessageKeys {
  cipher_key: CipherKey;
  counter: number;
  mac_key: MacKey;

  constructor() {
    this.cipher_key = new CipherKey();
    this.counter = -1;
    this.mac_key = new MacKey(new Uint8Array([]));
  }

  static new(cipher_key: CipherKey, mac_key: MacKey, counter: number): MessageKeys {
    const mk = ClassUtil.new_instance(MessageKeys);
    mk.cipher_key = cipher_key;
    mk.mac_key = mac_key;
    mk.counter = counter;
    return mk;
  }

  private _counter_as_nonce(): Uint8Array {
    const nonce = new ArrayBuffer(8);
    new DataView(nonce).setUint32(0, this.counter);
    return new Uint8Array(nonce);
  }

  encrypt(plaintext: string | Uint8Array): Uint8Array {
    return this.cipher_key.encrypt(plaintext, this._counter_as_nonce());
  }

  decrypt(ciphertext: Uint8Array): Uint8Array {
    return this.cipher_key.decrypt(ciphertext, this._counter_as_nonce());
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(3);
    encoder.u8(0);
    this.cipher_key.encode(encoder);
    encoder.u8(1);
    this.mac_key.encode(encoder);
    encoder.u8(2);
    return encoder.u32(this.counter);
  }

  static decode(decoder: CBOR.Decoder): MessageKeys {
    const self = ClassUtil.new_instance(MessageKeys);

    const nprops = decoder.object();
    for (let index = 0; index <= nprops - 1; index++) {
      switch (decoder.u8()) {
        case 0:
          self.cipher_key = CipherKey.decode(decoder);
          break;
        case 1:
          self.mac_key = MacKey.decode(decoder);
          break;
        case 2:
          self.counter = decoder.u32();
          break;
        default:
          decoder.skip();
      }
    }

    return self;
  }
}

export {MessageKeys};
