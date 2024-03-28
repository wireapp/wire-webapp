/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {PreKey} from '@wireapp/api-client/lib/auth';

import {Cryptobox} from '@wireapp/cryptobox';
import {keys as ProteusKeys} from '@wireapp/proteus';
import {CRUDEngine} from '@wireapp/store-engine';

import {CryptoClient} from './CryptoClient.types';

type Config = {
  onNewPrekeys: (prekeys: PreKey[]) => void;
};

export function buildClient(storeEngine: CRUDEngine, config: Config & {nbPrekeys: number}) {
  const cryptobox = new Cryptobox(storeEngine, config.nbPrekeys);
  return new CryptoboxWrapper(cryptobox, config);
}

export class CryptoboxWrapper implements CryptoClient {
  public readonly version: string = '1.0.0';
  constructor(
    private readonly cryptobox: Cryptobox,
    config: Config,
  ) {
    this.cryptobox.on(Cryptobox.TOPIC.NEW_PREKEYS, prekeys => {
      const serializedPreKeys = prekeys.map(prekey => this.cryptobox.serialize_prekey(prekey));
      config.onNewPrekeys(serializedPreKeys);
    });
  }

  getNativeClient() {
    return this.cryptobox;
  }

  async encrypt(sessions: string[], plainText: Uint8Array) {
    const encryptedPayloads: [string, Uint8Array][] = [];
    for (const sessionId of sessions) {
      const encrypted = await this.cryptobox.encrypt(sessionId, plainText);
      encryptedPayloads.push([sessionId, new Uint8Array(encrypted)]);
    }
    return new Map(encryptedPayloads);
  }

  decrypt(sessionId: string, message: Uint8Array) {
    return this.cryptobox.decrypt(sessionId, message.buffer);
  }

  async init() {
    await this.cryptobox.load();
  }

  async create(_nbPrekeys: number, entropy?: Uint8Array) {
    const initialPrekeys = await this.cryptobox.create(entropy);
    const prekeys = initialPrekeys
      .map(preKey => {
        const preKeyJson = this.cryptobox.serialize_prekey(preKey);
        if (preKeyJson.id !== ProteusKeys.PreKey.MAX_PREKEY_ID) {
          return preKeyJson;
        }
        return {id: -1, key: ''};
      })
      .filter(serializedPreKey => serializedPreKey.key);

    return {
      prekeys,
      lastPrekey: this.cryptobox.serialize_prekey(this.cryptobox.lastResortPreKey!),
    };
  }

  async getFingerprint() {
    return this.cryptobox.getIdentity().public_key.fingerprint();
  }

  async getRemoteFingerprint(sessionId: string) {
    const session = await this.cryptobox.session_load(sessionId);
    return session.fingerprint_remote();
  }

  sessionFromMessage(sessionId: string, message: Uint8Array) {
    return this.decrypt(sessionId, message);
  }

  async consumePrekey() {
    // Cryptobox is keeping track of consumed prekeys internally
  }

  async sessionFromPrekey(sessionId: string, prekey: Uint8Array) {
    return void (await this.cryptobox.session_from_prekey(sessionId, prekey.buffer));
  }

  async sessionExists(sessionId: string) {
    try {
      return !!(await this.cryptobox.session_load(sessionId));
    } catch {
      return false;
    }
  }

  async saveSession() {
    // Cryptobox saves sessions automatically
  }

  async deleteSession(sessionId: string) {
    await this.cryptobox.session_delete(sessionId);
  }

  async newPrekey() {
    // CryptoBox is generating prekeys internally
    return {id: 0, key: ''};
  }

  async debugBreakSession(sessionId: string) {
    const session = await this.cryptobox.session_load(sessionId);
    session.session.session_states = {};

    this.cryptobox['cachedSessions'].set(sessionId, session);
  }

  async debugResetIdentity() {
    await this.cryptobox.create();
  }

  async wipe() {}
}
