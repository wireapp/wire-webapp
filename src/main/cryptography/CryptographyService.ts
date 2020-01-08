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

import {APIClient} from '@wireapp/api-client';
import {PreKey as SerializedPreKey} from '@wireapp/api-client/dist/auth/';
import {RegisteredClient} from '@wireapp/api-client/dist/client/';
import {OTRRecipients} from '@wireapp/api-client/dist/conversation/';
import {ConversationOtrMessageAddEvent} from '@wireapp/api-client/dist/event';
import {UserPreKeyBundleMap} from '@wireapp/api-client/dist/user/';
import {Cryptobox} from '@wireapp/cryptobox';
import {keys as ProteusKeys} from '@wireapp/proteus';
import {GenericMessage} from '@wireapp/protocol-messaging';
import {CRUDEngine} from '@wireapp/store-engine';
import {Decoder, Encoder} from 'bazinga64';
import logdown from 'logdown';
import {GenericMessageType, PayloadBundle, PayloadBundleSource} from '../conversation';
import {SessionPayloadBundle} from '../cryptography/';
import {CryptographyDatabaseRepository} from './CryptographyDatabaseRepository';
import {GenericMessageMapper} from './GenericMessageMapper';

export interface MetaClient extends RegisteredClient {
  meta: {
    is_verified?: boolean;
    primary_key: string;
  };
}

export class CryptographyService {
  private readonly logger: logdown.Logger;

  public cryptobox: Cryptobox;
  private readonly database: CryptographyDatabaseRepository;

  constructor(readonly apiClient: APIClient, private readonly storeEngine: CRUDEngine) {
    this.cryptobox = new Cryptobox(this.storeEngine);
    this.database = new CryptographyDatabaseRepository(this.storeEngine);
    this.logger = logdown('@wireapp/core/cryptography/CryptographyService', {
      logger: console,
      markdown: false,
    });
  }

  public static constructSessionId(userId: string, clientId: string): string {
    return `${userId}@${clientId}`;
  }

  public async createCryptobox(): Promise<SerializedPreKey[]> {
    const initialPreKeys: ProteusKeys.PreKey[] = await this.cryptobox.create();

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

  public decrypt(sessionId: string, encodedCiphertext: string): Promise<Uint8Array> {
    this.logger.log(`Decrypting message for session ID "${sessionId}"`);
    const messageBytes: Uint8Array = Decoder.fromBase64(encodedCiphertext).asBytes;
    return this.cryptobox.decrypt(sessionId, messageBytes.buffer);
  }

  private static dismantleSessionId(sessionId: string): string[] {
    return sessionId.split('@');
  }

  public async encrypt(plainText: Uint8Array, preKeyBundles: UserPreKeyBundleMap): Promise<OTRRecipients> {
    const recipients: OTRRecipients = {};
    const encryptions: Promise<SessionPayloadBundle>[] = [];

    for (const userId in preKeyBundles) {
      recipients[userId] = {};

      for (const clientId in preKeyBundles[userId]) {
        const preKeyPayload: SerializedPreKey = preKeyBundles[userId][clientId];
        const preKey: string = preKeyPayload.key;
        const sessionId: string = CryptographyService.constructSessionId(userId, clientId);
        encryptions.push(this.encryptPayloadForSession(sessionId, plainText, preKey));
      }
    }

    const payloads: SessionPayloadBundle[] = await Promise.all(encryptions);

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
    base64EncodedPreKey: string,
  ): Promise<SessionPayloadBundle> {
    this.logger.log(`Encrypting Payload for session ID "${sessionId}"`);
    let encryptedPayload;

    try {
      const decodedPreKeyBundle: Uint8Array = Decoder.fromBase64(base64EncodedPreKey).asBytes;
      const payloadAsBuffer: ArrayBuffer = await this.cryptobox.encrypt(
        sessionId,
        plainText,
        decodedPreKeyBundle.buffer,
      );
      encryptedPayload = Encoder.toBase64(payloadAsBuffer).asString;
    } catch (error) {
      this.logger.error(`Could not encrypt payload: ${error.message}`);
      encryptedPayload = '💣';
    }

    return {encryptedPayload, sessionId};
  }

  public async initCryptobox(): Promise<void> {
    await this.cryptobox.load();
  }

  public deleteCryptographyStores(): Promise<boolean[]> {
    return this.database.deleteStores();
  }

  public async resetSession(sessionId: string): Promise<void> {
    await this.cryptobox.session_delete(sessionId);
    this.logger.log(`Deleted session ID "${sessionId}".`);
  }

  public async decodeGenericMessage(
    otrMessage: ConversationOtrMessageAddEvent,
    source: PayloadBundleSource,
  ): Promise<PayloadBundle> {
    const {
      from,
      data: {sender, text: cipherText},
    } = otrMessage;

    const sessionId = CryptographyService.constructSessionId(from, sender);
    const decryptedMessage = await this.decrypt(sessionId, cipherText);
    const genericMessage = GenericMessage.decode(decryptedMessage);

    if (genericMessage.content === GenericMessageType.EPHEMERAL) {
      const unwrappedMessage = GenericMessageMapper.mapGenericMessage(genericMessage.ephemeral, otrMessage, source);
      unwrappedMessage.id = genericMessage.messageId;
      if (genericMessage.ephemeral) {
        const expireAfterMillis = genericMessage.ephemeral.expireAfterMillis;
        unwrappedMessage.messageTimer =
          typeof expireAfterMillis === 'number' ? expireAfterMillis : expireAfterMillis.toNumber();
      }
      return unwrappedMessage;
    }
    return GenericMessageMapper.mapGenericMessage(genericMessage, otrMessage, source);
  }
}
