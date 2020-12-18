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
import {ChainKey} from './ChainKey';
import {DecodeError} from '../errors';

export class SendChain {
  chain_key: ChainKey;
  readonly ratchet_key: KeyPair;
  private static readonly propertiesLength = 2;

  constructor(chainKey: ChainKey, keypair: KeyPair) {
    this.chain_key = chainKey;
    this.ratchet_key = keypair;
  }

  encode(encoder: CBOR.Encoder): CBOR.Encoder {
    encoder.object(SendChain.propertiesLength);
    encoder.u8(0);
    this.chain_key.encode(encoder);
    encoder.u8(1);
    return this.ratchet_key.encode(encoder);
  }

  static decode(decoder: CBOR.Decoder): SendChain {
    const propertiesLength = decoder.object();
    if (propertiesLength === SendChain.propertiesLength) {
      decoder.u8();
      const chainKey = ChainKey.decode(decoder);

      decoder.u8();
      const ratchetKey = KeyPair.decode(decoder);

      return new SendChain(chainKey, ratchetKey);
    }

    throw new DecodeError(`Unexpected number of properties: "${propertiesLength}"`);
  }
}
