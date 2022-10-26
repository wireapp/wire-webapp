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
import {PreKey} from '@wireapp/api-client/lib/auth/';
import {RegisteredClient} from '@wireapp/api-client/lib/client/';
import {
  OTRClientMap,
  OTRRecipients,
  QualifiedOTRRecipients,
  QualifiedUserClients,
  UserClients,
} from '@wireapp/api-client/lib/conversation/';
import {ConversationOtrMessageAddEvent} from '@wireapp/api-client/lib/event';
import {QualifiedId, QualifiedUserPreKeyBundleMap, UserPreKeyBundleMap} from '@wireapp/api-client/lib/user/';
import {Cryptobox, CryptoboxSession} from '@wireapp/cryptobox';
import {errors as ProteusErrors, keys as ProteusKeys} from '@wireapp/proteus';
import {GenericMessage} from '@wireapp/protocol-messaging';
import {CRUDEngine} from '@wireapp/store-engine';
import {Decoder, Encoder} from 'bazinga64';
import logdown from 'logdown';

import {GenericMessageType, PayloadBundle, PayloadBundleSource} from '../conversation';
import {SessionPayloadBundle} from '../cryptography/';
import {isUserClients} from '../util';
import {CryptographyDatabaseRepository} from './CryptographyDatabaseRepository';
import {GenericMessageMapper} from './GenericMessageMapper';

export type DecryptionError = {code: number; message: string};

export type SessionId = {
  userId: string;
  clientId: string;
  domain?: string;
};
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
    private readonly config: {useQualifiedIds: boolean; nbPrekeys: number},
  ) {
    this.cryptobox = new Cryptobox(this.storeEngine, config.nbPrekeys);
    this.database = new CryptographyDatabaseRepository(this.storeEngine);
    this.logger = logdown('@wireapp/core/CryptographyService', {
      logger: console,
      markdown: false,
    });
  }

  public constructSessionId(userId: string | QualifiedId, clientId: string, domain?: string): string {
    const {id, domain: baseDomain} = typeof userId === 'string' ? {id: userId, domain} : userId;
    const baseId = `${id}@${clientId}`;
    return baseDomain && this.config.useQualifiedIds ? `${baseDomain}@${baseId}` : baseId;
  }

  private isSessionId(object: any): object is SessionId {
    return object.userId && object.clientId;
  }

  /**
   * Splits a sessionId into userId, clientId & domain (if any).
   */
  public parseSessionId(sessionId: string): SessionId {
    // see https://regex101.com/r/c8FtCw/1
    const regex = /((?<domain>.+)@)?(?<userId>.+)@(?<clientId>.+)$/g;
    const match = regex.exec(sessionId);
    if (!match || !this.isSessionId(match.groups)) {
      throw new Error(`given session id "${sessionId}" has wrong format`);
    }
    return match.groups;
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

  public setCryptoboxHooks({
    onNewPrekeys,
    onNewSession,
  }: {
    onNewPrekeys?: (prekeys: {id: number; key: string}[]) => void;
    onNewSession?: (sessionId: SessionId) => void;
  }) {
    if (onNewPrekeys) {
      this.cryptobox.on(Cryptobox.TOPIC.NEW_PREKEYS, prekeys => {
        const serializedPreKeys = prekeys.map(prekey => this.cryptobox.serialize_prekey(prekey));
        onNewPrekeys(serializedPreKeys);
      });
    }
    if (onNewSession) {
      this.cryptobox.on(Cryptobox.TOPIC.NEW_SESSION, sessionId => onNewSession(this.parseSessionId(sessionId)));
    }
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

  public async createCryptobox(entropyData?: Uint8Array): Promise<PreKey[]> {
    const initialPreKeys = await this.cryptobox.create(entropyData);

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
      const clientIds = isUserClients(users)
        ? users[userId]
        : Object.keys(users[userId])
            // We filter out clients that have `null` prekey
            .filter(clientId => !!users[userId][clientId]);
      for (const clientId of clientIds) {
        const base64PreKey = isUserClients(users) ? undefined : users[userId][clientId]?.key;
        const sessionId = this.constructSessionId(userId, clientId, domain);
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

  /**
   * Get the fingerprint of the local client.
   */
  public getLocalFingerprint(): string {
    return this.cryptobox.getIdentity().public_key.fingerprint();
  }

  /**
   * Get the fingerprint of a remote client
   * @param userId ID of user
   * @param clientId ID of client
   * @param prekey A prekey can be given to create a session if it doesn't already exist.
   *   If not provided and the session doesn't exists it will fetch a new prekey from the backend
   */
  public async getRemoteFingerprint(userId: QualifiedId, clientId: string, prekey?: PreKey): Promise<string> {
    const session = await this.getOrCreateSession(userId, clientId, prekey);
    return session.fingerprint_remote();
  }

  private async getOrCreateSession(
    userId: QualifiedId,
    clientId: string,
    initialPrekey?: PreKey,
  ): Promise<CryptoboxSession> {
    const sessionId = this.constructSessionId(userId, clientId);
    try {
      return await this.cryptobox.session_load(sessionId);
    } catch (error) {
      const prekey = initialPrekey ?? (await this.getUserPrekey(userId, clientId)).prekey;
      const prekeyBuffer = Decoder.fromBase64(prekey.key).asBytes;
      return this.cryptobox.session_from_prekey(sessionId, prekeyBuffer.buffer);
    }
  }

  private getUserPrekey(userId: QualifiedId, clientId: string) {
    return this.apiClient.api.user.getClientPreKey(userId, clientId);
  }

  public deleteCryptographyStores(): Promise<boolean[]> {
    return this.database.deleteStores();
  }

  public async resetSession(sessionId: string): Promise<void> {
    await this.cryptobox.session_delete(sessionId);
    this.logger.log(`Deleted session ID "${sessionId}".`);
  }

  public async decryptMessage(otrMessage: ConversationOtrMessageAddEvent): Promise<GenericMessage> {
    const {
      from,
      qualified_from,
      data: {sender, text: cipherText},
    } = otrMessage;

    const sessionId = this.constructSessionId(from, sender, qualified_from?.domain);
    try {
      const decryptedMessage = await this.decrypt(sessionId, cipherText);
      return GenericMessage.decode(decryptedMessage);
    } catch (error) {
      throw this.generateDecryptionError(otrMessage, error as ProteusErrors.DecodeError);
    }
  }

  public mapGenericMessage(
    otrMessage: ConversationOtrMessageAddEvent,
    genericMessage: GenericMessage,
    source: PayloadBundleSource,
  ): PayloadBundle {
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

  private generateDecryptionError(
    event: ConversationOtrMessageAddEvent,
    error: ProteusErrors.DecryptError,
  ): DecryptionError {
    const errorCode = error.code ?? 999;
    let message = 'Unknown decryption error';

    const {data: eventData, from: remoteUserId, time: formattedTime} = event;
    const remoteClientId = eventData.sender;

    const isDuplicateMessage = error instanceof ProteusErrors.DecryptError.DuplicateMessage;
    const isOutdatedMessage = error instanceof ProteusErrors.DecryptError.OutdatedMessage;
    // We don't need to show these message errors to the user
    if (isDuplicateMessage || isOutdatedMessage) {
      message = `Message from user ID "${remoteUserId}" at "${formattedTime}" will not be handled because it is outdated or a duplicate.`;
    }

    const isInvalidMessage = error instanceof ProteusErrors.DecryptError.InvalidMessage;
    const isInvalidSignature = error instanceof ProteusErrors.DecryptError.InvalidSignature;
    const isRemoteIdentityChanged = error instanceof ProteusErrors.DecryptError.RemoteIdentityChanged;
    // Session is broken, let's see what's really causing it...
    if (isInvalidMessage || isInvalidSignature) {
      message = `Session with user '${remoteUserId}' (${remoteClientId}) is broken.\nReset the session for possible fix.`;
    } else if (isRemoteIdentityChanged) {
      message = `Remote identity of client '${remoteClientId}' from user '${remoteUserId}' changed`;
    }

    this.logger.warn(
      `Failed to decrypt event from client '${remoteClientId}' of user '${remoteUserId}' (${formattedTime}).\nError Code: '${errorCode}'\nError Message: ${error.message}`,
      error,
    );
    return {code: errorCode, message};
  }
}
