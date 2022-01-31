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
import type {
  OTRClientMap,
  OTRRecipients,
  QualifiedOTRRecipients,
  QualifiedUserClients,
  UserClients,
} from '@wireapp/api-client/src/conversation/';
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
import {isUserClients} from '../util';
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

  constructor(
    readonly apiClient: APIClient,
    private readonly storeEngine: CRUDEngine,
    private readonly config: {useQualifiedIds?: boolean} = {},
  ) {
    this.cryptobox = new Cryptobox(this.storeEngine);
    this.database = new CryptographyDatabaseRepository(this.storeEngine);
    this.logger = logdown('@wireapp/core/cryptography/CryptographyService', {
      logger: console,
      markdown: false,
    });
  }

  public static constructSessionId(userId: string, clientId: string, domain: string | null): string {
    const baseId = `${userId}@${clientId}`;
    return domain ? `${domain}@${baseId}` : baseId;
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

  public async encryptQualified(
    plainText: Uint8Array,
    preKeyBundles: QualifiedUserPreKeyBundleMap | QualifiedUserClients,
  ): Promise<{missing: QualifiedUserClients; encrypted: QualifiedOTRRecipients}> {
    const qualifiedOTRRecipients: QualifiedOTRRecipients = {};
    const missing: QualifiedUserClients = {};

    for (const [domain, preKeyBundleMap] of Object.entries(preKeyBundles)) {
      const result = await this.encrypt(plainText, preKeyBundleMap, domain);
      qualifiedOTRRecipients[domain] = result.encrypted;
      missing[domain] = result.missing;
    }

    return {
      encrypted: qualifiedOTRRecipients,
      missing,
    };
  }

  public async encrypt(
    plainText: Uint8Array,
    users: UserPreKeyBundleMap | UserClients,
    domain?: string,
  ): Promise<{missing: UserClients; encrypted: OTRRecipients<Uint8Array>}> {
    const encrypted: OTRRecipients<Uint8Array> = {};
    const missing: UserClients = {};

    for (const userId in users) {
      const clientIds = isUserClients(users) ? users[userId] : Object.keys(users[userId]);
      for (const clientId of clientIds) {
        const base64PreKey = isUserClients(users) ? undefined : users[userId][clientId].key;
        const sessionId = CryptographyService.constructSessionId(userId, clientId, domain || null);
        const result = await this.encryptPayloadForSession(sessionId, plainText, base64PreKey);
        if (result) {
          encrypted[userId] ||= {};
          encrypted[userId][clientId] = result.encryptedPayload;
        } else {
          missing[userId] ||= [];
          missing[userId].push(clientId);
        }
      }
    }

    return {encrypted, missing};
  }

  private async encryptPayloadForSession(
    sessionId: string,
    plainText: Uint8Array,
    base64EncodedPreKey?: string,
  ): Promise<SessionPayloadBundle | undefined> {
    this.logger.log(`Encrypting payload for session ID "${sessionId}"`);

    let encryptedPayload: Uint8Array;

    try {
      const decodedPreKeyBundle = base64EncodedPreKey
        ? Decoder.fromBase64(base64EncodedPreKey).asBytes.buffer
        : undefined;
      const payloadAsArrayBuffer = await this.cryptobox.encrypt(sessionId, plainText, decodedPreKeyBundle);
      encryptedPayload = new Uint8Array(payloadAsArrayBuffer);
    } catch (error) {
      const notFoundErrorCode = 2;
      if ((error as any).code === notFoundErrorCode) {
        // If the session is not in the database, we just return undefined. Later on there will be a mismatch and the session will be created
        return undefined;
      }
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
      qualified_from,
      data: {sender, text: cipherText},
    } = otrMessage;

    const domain = this.config.useQualifiedIds ? qualified_from!.domain : null;
    const sessionId = CryptographyService.constructSessionId(from, sender, domain);
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
