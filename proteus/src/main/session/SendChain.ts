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

import {KeyPair} from '../keys/KeyPair';
import * as ClassUtil from '../util/ClassUtil';
import {ChainKey} from './ChainKey';

export class SendChain {
  static new(chain_key: ChainKey, keypair: KeyPair): SendChain {
    const sc = ClassUtil.new_instance(SendChain);
    sc.chain_key = chain_key;
    sc.ratchet_key = keypair;
    return sc;
  }

  static decode(decoder: CBOR.Decoder): SendChain {
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

    return self;
  }
  chain_key: ChainKey;
  ratchet_key: KeyPair;

  constructor() {
    this.chain_key = new ChainKey();
    this.ratchet_key = new KeyPair();
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(2);
    encoder.u8(0);
    this.chain_key.encode(encoder);
    encoder.u8(1);
    return this.ratchet_key.encode(encoder);
  }
}
