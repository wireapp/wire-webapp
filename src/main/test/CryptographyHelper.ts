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

import {Cryptobox} from '@wireapp/cryptobox';
import * as Proteus from '@wireapp/proteus';
import {PreKey} from '@wireapp/proteus/dist/keys';
import * as bazinga64 from 'bazinga64';

import {CryptographyService} from '../cryptography';

const StoreHelper = require('./StoreHelper');

export async function createEncodedCipherText(
  receiver: Proteus.keys.IdentityKeyPair,
  preKey: PreKey,
  text: string,
): Promise<string> {
  const senderEngine = await StoreHelper.createMemoryEngine();
  const sender = new Cryptobox(senderEngine, 1);
  await sender.create();

  const sessionId = `from-${sender.identity!.public_key.fingerprint()}-to-${preKey.key_pair.public_key.fingerprint()}`;

  const alicePublicKey = receiver.public_key;
  const publicPreKeyBundle = Proteus.keys.PreKeyBundle.new(alicePublicKey, preKey);
  const encryptedPreKeyMessage = await sender.encrypt(sessionId, text, publicPreKeyBundle.serialise());
  return bazinga64.Encoder.toBase64(encryptedPreKeyMessage).asString;
}

export async function getPlainText(
  cryptographyService: CryptographyService,
  encodedPreKeyMessage: string,
  sessionId: string = `temp-${Date.now()}`,
): Promise<string | void> {
  const decryptResult = await cryptographyService.decrypt(sessionId, encodedPreKeyMessage);
  if (decryptResult.isSuccess) {
    return Buffer.from(decryptResult.value).toString('utf8');
  }
}
