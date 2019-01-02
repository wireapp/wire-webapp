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

const bazinga64 = require('bazinga64');
const Proteus = require('@wireapp/proteus');
const StoreHelper = require('./StoreHelper');
const {Cryptobox} = require('@wireapp/cryptobox');

module.exports = {
  createEncodedCipherText: async (receiver, preKey, text) => {
    const senderEngine = await StoreHelper.createMemoryEngine();
    const sender = new Cryptobox(senderEngine, 1);
    await sender.create();

    const sessionId = `from-${sender.identity.public_key.fingerprint()}-to-${preKey.key_pair.public_key.fingerprint()}`;

    const alicePublicKey = receiver.public_key;
    const publicPreKeyBundle = Proteus.keys.PreKeyBundle.new(alicePublicKey, preKey);
    const encryptedPreKeyMessage = await sender.encrypt(sessionId, text, publicPreKeyBundle.serialise());
    return bazinga64.Encoder.toBase64(encryptedPreKeyMessage).asString;
  },
  getPlainText: async (cryptographyService, encodedPreKeyMessage, sessionId = `temp-${Date.now()}`) => {
    const decryptResult = await cryptographyService.decrypt(sessionId, encodedPreKeyMessage);
    if (decryptResult.isSuccess) {
      return Buffer.from(decryptResult.value).toString('utf8');
    }
  },
};
