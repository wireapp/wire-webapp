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

import type {APIClient} from '@wireapp/api-client';
import type {PreKey as SerializedPreKey} from '@wireapp/api-client/src/auth/';
import type {RegisteredClient} from '@wireapp/api-client/src/client/';
import type {OTRClientMap, OTRRecipients, QualifiedOTRRecipients} from '@wireapp/api-client/src/conversation/';
import type {ConversationOtrMessageAddEvent} from '@wireapp/api-client/src/event';
import type {QualifiedUserPreKeyBundleMap, UserPreKeyBundleMap} from '@wireapp/api-client/src/user/';
import {Cryptobox} from '@wireapp/cryptobox';
import {keys as ProteusKeys} from '@wireapp/proteus';
import {GenericMessage} from '@wireapp/protocol-messaging';
import type {CRUDEngine} from '@wireapp/store-engine';
import {Decoder, Encoder} from 'bazinga64';
import logdown from 'logdown';

import {GenericMessageType, PayloadBundle, PayloadBundleSource} from '../conversation';
import type {SessionPayloadBundle} from '../cryptography/';
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

  public static convertArrayRecipientsToBase64(recipients: OTRRecipients<Uint8Array>): OTRRecipients<string> {
    return Object.fromEntries(
      Object.entries(recipients).map(([userId, otrClientMap]) => {
        const otrClientMapWithBase64: OTRClientMap<string> = Object.fromEntries(
          Object.entries(otrClientMap).map(([clientId, payload]) => {
            return [clientId, Encoder.toBase64(payload).asString];
          }),
        );
        return [userId, otrClientMapWithBase64];
      }),
    );
  }

  public static convertBase64RecipientsToArray(recipients: OTRRecipients<string>): OTRRecipients<Uint8Array> {
    return Object.fromEntries(
      Object.entries(recipients).map(([userId, otrClientMap]) => {
        const otrClientMapWithUint8Array: OTRClientMap<Uint8Array> = Object.fromEntries(
          Object.entries(otrClientMap).map(([clientId, payload]) => {
            return [clientId, Decoder.fromBase64(payload).asBytes];
          }),
        );
        return [userId, otrClientMapWithUint8Array];
      }),
    );
  }

  public async createCryptobox(): Promise<SerializedPreKey[]> {
    const initialPreKeys = await this.cryptobox.create();

    return initialPreKeys
      .map(preKey => {
        const preKeyJson = this.cryptobox.serialize_prekey(preKey);
        if (preKeyJson.id !== ProteusKeys.PreKey.MAX_PREKEY_ID) {
          return preKeyJson;
        }
        return {id: -1, key: ''};
      })
      .filter(serializedPreKey => serializedPreKey.key);
  }

  public decrypt(sessionId: string, encodedCiphertext: string): Promise<Uint8Array> {
    this.logger.log(`Decrypting message for session ID "${sessionId}"`);
    const messageBytes = Decoder.fromBase64(encodedCiphertext).asBytes;
    return this.cryptobox.decrypt(sessionId, messageBytes.buffer);
  }

  private static dismantleSessionId(sessionId: string): string[] {
    return sessionId.split('@');
  }

  public async encryptQualified(
    plainText: Uint8Array,
    preKeyBundles: QualifiedUserPreKeyBundleMap,
  ): Promise<QualifiedOTRRecipients> {
    const qualifiedOTRRecipients: QualifiedOTRRecipients = {};

    for (const [domain, preKeyBundleMap] of Object.entries(preKeyBundles)) {
      qualifiedOTRRecipients[domain] = await this.encrypt(plainText, preKeyBundleMap);
    }

    return qualifiedOTRRecipients;
  }

  public async encrypt(plainText: Uint8Array, preKeyBundles: UserPreKeyBundleMap): Promise<OTRRecipients<Uint8Array>> {
    const recipients: OTRRecipients<Uint8Array> = {};
    const bundles: Promise<SessionPayloadBundle>[] = [];

    for (const userId in preKeyBundles) {
      recipients[userId] = {};

      for (const clientId in preKeyBundles[userId]) {
        const {key: base64PreKey} = preKeyBundles[userId][clientId];
        const sessionId = CryptographyService.constructSessionId(userId, clientId);
        bundles.push(this.encryptPayloadForSession(sessionId, plainText, base64PreKey));
      }
    }

    const payloads = await Promise.all(bundles);

    payloads.forEach(payload => {
      const {encryptedPayload, sessionId} = payload;
      const [userId, clientId] = CryptographyService.dismantleSessionId(sessionId);
      recipients[userId][clientId] = encryptedPayload;
    });

    return recipients;
  }

  private async encryptPayloadForSession(
    sessionId: string,
    plainText: Uint8Array,
    base64EncodedPreKey: string,
  ): Promise<SessionPayloadBundle> {
    this.logger.log(`Encrypting payload for session ID "${sessionId}"`);

    let encryptedPayload: Uint8Array;

    try {
      const decodedPreKeyBundle = Decoder.fromBase64(base64EncodedPreKey).asBytes;
      const payloadAsArrayBuffer = await this.cryptobox.encrypt(sessionId, plainText, decodedPreKeyBundle.buffer);
      encryptedPayload = new Uint8Array(payloadAsArrayBuffer);
    } catch (error) {
      this.logger.error(`Could not encrypt payload: ${(error as Error).message}`);
      encryptedPayload = new Uint8Array(Buffer.from('💣', 'utf-8'));
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
