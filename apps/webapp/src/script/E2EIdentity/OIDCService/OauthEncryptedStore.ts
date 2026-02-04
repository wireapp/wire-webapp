/*
 * Wire
 * Copyright (C) 2024 Wire Swiss GmbH
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

import {Encoder, Decoder} from 'bazinga64';

import {getLogger} from 'Util/Logger';

const logger = getLogger('OauthEncryptedStore');

export class EncryptedStorage {
  private encryptionKey: Promise<CryptoKey>;
  length = Promise.resolve(0);

  constructor(secretKey: Uint8Array) {
    this.encryptionKey = crypto.subtle.importKey('raw', Uint8Array.from(secretKey), 'AES-GCM', false, [
      'encrypt',
      'decrypt',
    ]);
  }

  async setItem(key: string, value: string) {
    try {
      const encryptionKey = await this.encryptionKey;
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encodedBytes = Encoder.toBase64(value).asBytes;
      const encryptedValue = await window.crypto.subtle.encrypt(
        {name: 'AES-GCM', iv},
        encryptionKey,
        Uint8Array.from(encodedBytes),
      );
      const base64Value = Encoder.toBase64(encryptedValue).asString;
      window.localStorage.setItem(key, JSON.stringify({value: base64Value, iv: Array.from(iv)}));
    } catch (error) {
      logger.development.error('Failed to set item', error);
      throw error;
    }
  }

  async getItem(key: string) {
    const entry = localStorage.getItem(key);
    if (entry) {
      const encryptionKey = await this.encryptionKey;
      const {value, iv} = JSON.parse(entry);
      const decodedBytes = Decoder.fromBase64(value).asBytes;
      const decrypted = await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv: new Uint8Array(iv)},
        encryptionKey,
        Uint8Array.from(decodedBytes),
      );
      return Decoder.fromBase64(Array.from(new Uint8Array(decrypted))).asString;
    }
    return null;
  }

  async removeItem(key: string) {
    localStorage.removeItem(key);
  }

  async clear() {
    localStorage.clear();
  }
  async key(): Promise<null> {
    return null;
  }
}
