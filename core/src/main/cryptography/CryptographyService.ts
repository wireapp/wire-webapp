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

const logdown = require('logdown');
import APIClient = require('@wireapp/api-client');
import {PreKey as SerializedPreKey} from '@wireapp/api-client/dist/commonjs/auth/index';
import {RegisteredClient} from '@wireapp/api-client/dist/commonjs/client/index';
import {OTRRecipients} from '@wireapp/api-client/dist/commonjs/conversation/index';
import {UserPreKeyBundleMap} from '@wireapp/api-client/dist/commonjs/user/index';
import {Cryptobox} from '@wireapp/cryptobox';
import * as ProteusKeys from '@wireapp/proteus/dist/keys/root';
import {CRUDEngine} from '@wireapp/store-engine/dist/commonjs/engine/index';
import {Decoder, Encoder} from 'bazinga64';
import {SessionPayloadBundle} from '../cryptography/root';
import CryptographyDatabaseRepository from './CryptographyDatabaseRepository';

export interface MetaClient extends RegisteredClient {
  meta: {
    is_verified?: boolean;
    primary_key: string;
  };
}

class CryptographyService {
  private readonly logger: any = logdown('@wireapp/core/cryptography/CryptographyService', {
    logger: console,
    markdown: false,
  });

  public cryptobox: Cryptobox;
  private readonly database: CryptographyDatabaseRepository;

  constructor(readonly apiClient: APIClient, private readonly storeEngine: CRUDEngine) {
    this.cryptobox = new Cryptobox(this.storeEngine);
    this.database = new CryptographyDatabaseRepository(this.storeEngine);
  }

  public static constructSessionId(userId: string, clientId: string): string {
    return `${userId}@${clientId}`;
  }

  public async createCryptobox(): Promise<Array<SerializedPreKey>> {
    this.logger.log('createCryptobox');
    const initialPreKeys: Array<ProteusKeys.PreKey> = await this.cryptobox.create();

    return initialPreKeys
      .map(preKey => {
        const preKeyJson: SerializedPreKey = this.cryptobox.serialize_prekey(preKey);
        if (preKeyJson.id !== ProteusKeys.PreKey.MAX_PREKEY_ID) {
          return preKeyJson;
        }
        return {id: -1, key: ''};
      })
      .filter(serializedPreKey => serializedPreKey.key);
  }

  public decrypt(sessionId: string, encodedCiphertext: string): Promise<Uint8Array | undefined> {
    this.logger.log('decrypt');
    const messageBytes: Uint8Array = Decoder.fromBase64(encodedCiphertext).asBytes;
    return this.cryptobox.decrypt(sessionId, messageBytes.buffer);
  }

  private static dismantleSessionId(sessionId: string): Array<string> {
    return sessionId.split('@');
  }

  public async encrypt(plainText: Uint8Array, preKeyBundles: UserPreKeyBundleMap): Promise<OTRRecipients> {
    this.logger.log('encrypt');
    const recipients: OTRRecipients = {};
    const encryptions: Array<Promise<SessionPayloadBundle>> = [];

    for (const userId in preKeyBundles) {
      recipients[userId] = {};

      for (const clientId in preKeyBundles[userId]) {
        const preKeyPayload: SerializedPreKey = preKeyBundles[userId][clientId];
        const preKey: string = preKeyPayload.key;
        const sessionId: string = CryptographyService.constructSessionId(userId, clientId);
        encryptions.push(this.encryptPayloadForSession(sessionId, plainText, preKey));
      }
    }

    const payloads: Array<SessionPayloadBundle> = await Promise.all(encryptions);

    if (payloads) {
      payloads.forEach((payload: SessionPayloadBundle) => {
        const sessionId: string = payload.sessionId;
        const encrypted: string = payload.encryptedPayload;
        const [userId, clientId] = CryptographyService.dismantleSessionId(sessionId);
        recipients[userId][clientId] = encrypted;
      });
    }

    return recipients;
  }

  private async encryptPayloadForSession(
    sessionId: string,
    plainText: Uint8Array,
    base64EncodedPreKey: string
  ): Promise<SessionPayloadBundle> {
    this.logger.log('encryptPayloadForSession');
    let encryptedPayload;

    try {
      const decodedPreKeyBundle: Uint8Array = Decoder.fromBase64(base64EncodedPreKey).asBytes;
      const payloadAsBuffer: ArrayBuffer = await this.cryptobox.encrypt(
        sessionId,
        plainText,
        decodedPreKeyBundle.buffer
      );
      encryptedPayload = Encoder.toBase64(payloadAsBuffer).asString;
    } catch (error) {
      encryptedPayload = '💣';
    }

    return {sessionId, encryptedPayload};
  }

  public async initCryptobox(): Promise<void> {
    this.logger.log('initCryptobox');
    await this.cryptobox.load();
  }

  public deleteCryptographyStores(): Promise<boolean[]> {
    this.logger.log('deleteCryptographyStores');
    return this.database.deleteStores();
  }

  public async resetSession(sessionId: string): Promise<void> {
    await this.cryptobox.session_delete(sessionId);
    this.logger.log(`Deleted session ID "${sessionId}".`);
  }
}

export {CryptographyService};
