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

import ko from 'knockout';
import type {AxiosError} from 'axios';
import {amplify} from 'amplify';
import {ConversationOtrMessageAddEvent} from '@wireapp/api-client/src/event';
import type {QualifiedId} from '@wireapp/api-client/src/user/';
import {Cryptobox, CryptoboxSession} from '@wireapp/cryptobox';
import {errors as ProteusErrors} from '@wireapp/proteus';
import {GenericMessage} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';
import type {PreKey as BackendPreKey} from '@wireapp/api-client/src/auth/';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {getLogger, Logger} from 'Util/Logger';
import {base64ToArray} from 'Util/util';

import {CryptographyMapper} from './CryptographyMapper';
import {Config} from '../Config';
import {EventName} from '../tracking/EventName';
import {ClientEntity} from '../client/ClientEntity';
import {CryptographyError} from '../error/CryptographyError';
import {UserError} from '../error/UserError';
import type {CryptographyService} from './CryptographyService';
import type {EventRecord} from '../storage';
import {EventBuilder} from '../conversation/EventBuilder';
import {container} from 'tsyringe';
import {Core} from '../service/CoreSingleton';

export interface SignalingKeys {
  enckey: string;
  mackey: string;
}

export interface ClientKeys {
  lastResortKey: BackendPreKey;
  preKeys: BackendPreKey[];
  signalingKeys: SignalingKeys;
}

export class CryptographyRepository {
  cryptobox?: Cryptobox;
  cryptographyMapper: CryptographyMapper;
  currentClient?: ko.Observable<ClientEntity>;
  logger: Logger;

  static get CONFIG() {
    return {
      UNKNOWN_DECRYPTION_ERROR_CODE: 999,
    };
  }

  static get REMOTE_ENCRYPTION_FAILURE(): string {
    return '💣';
  }

  constructor(
    private readonly cryptographyService: CryptographyService,
    private readonly core = container.resolve(Core),
  ) {
    this.logger = getLogger('CryptographyRepository');
    this.cryptographyMapper = new CryptographyMapper();
  }

  /**
   * Inits the cryptography repository with the given cryptobox and for the given client
   *
   * @param cryptobox The cryptobox instance for handling encryption and decryption of messages
   * @param client The local client of the logged user
   */
  init(cryptobox: Cryptobox, client: ko.Observable<ClientEntity>): void {
    this.cryptobox = cryptobox;
    this.currentClient = client;

    this.cryptobox.on(Cryptobox.TOPIC.NEW_PREKEYS, async preKeys => {
      const serializedPreKeys = preKeys.map(preKey => cryptobox.serialize_prekey(preKey));
      this.logger.log(`Received '${preKeys.length}' new PreKeys.`, serializedPreKeys);

      await this.cryptographyService.putClientPreKeys(client().id, serializedPreKeys);
      this.logger.log(`Successfully uploaded '${serializedPreKeys.length}' PreKeys.`, serializedPreKeys);
    });

    this.cryptobox.on(Cryptobox.TOPIC.NEW_SESSION, sessionId => {
      const {userId, clientId, domain} = ClientEntity.dismantleUserClientId(sessionId);
      const qualifiedId = {domain, id: userId};
      amplify.publish(WebAppEvents.CLIENT.ADD, qualifiedId, {id: clientId}, true);
    });
  }

  /**
   * Get the fingerprint of the local identity.
   * @returns Fingerprint of local identity public key
   */
  getLocalFingerprint(): string {
    return this.cryptobox!.getIdentity().public_key.fingerprint();
  }

  /**
   * Get the fingerprint of a remote identity.
   * @param userId ID of user
   * @param clientId ID of client
   * @param preKey PreKey to initialize a session from
   * @returns Resolves with the remote fingerprint
   */
  async getRemoteFingerprint(
    userId: QualifiedId,
    clientId: string,
    preKey?: BackendPreKey,
  ): Promise<string | undefined> {
    const cryptoboxSession = preKey
      ? await this.createSessionFromPreKey(preKey, userId, clientId)
      : await this.loadSession(userId, clientId);
    return cryptoboxSession ? cryptoboxSession.fingerprint_remote() : undefined;
  }

  /**
   * Get a pre-key for the given client of the user.
   *
   * @param userId User ID
   * @param clientId Client ID
   * @returns Resolves with a map of pre-keys for the requested clients
   */
  private getUserPreKeyByIds(userId: QualifiedId, clientId: string): Promise<BackendPreKey> {
    return this.cryptographyService
      .getUserPreKeyByIds(userId, clientId)
      .then(response => response.prekey)
      .catch(error => {
        const isNotFound = error.code === HTTP_STATUS.NOT_FOUND;
        if (isNotFound) {
          throw new UserError(UserError.TYPE.PRE_KEY_NOT_FOUND, UserError.MESSAGE.PRE_KEY_NOT_FOUND);
        }

        this.logger.error(`Failed to get pre-key from backend: ${error.message}`);
        throw new UserError(UserError.TYPE.REQUEST_FAILURE, UserError.MESSAGE.REQUEST_FAILURE);
      });
  }

  private loadSession(userId: QualifiedId, clientId: string): Promise<CryptoboxSession | void> {
    const sessionId = this.core.service!.cryptography.constructSessionId(userId, clientId);

    return this.cryptobox!.session_load(sessionId).catch(() => {
      return this.getUserPreKeyByIds(userId, clientId).then(preKey => {
        return this.createSessionFromPreKey(preKey, userId, clientId);
      });
    });
  }

  deleteSession(userId: QualifiedId, clientId: string): Promise<string> {
    const sessionId = this.core.service!.cryptography.constructSessionId(userId, clientId);
    return this.cryptobox!.session_delete(sessionId);
  }

  /**
   * Handle an encrypted event.
   * @param event Backend event to decrypt
   * @returns Resolves with decrypted and mapped message
   */
  async handleEncryptedEvent(event: ConversationOtrMessageAddEvent & {id?: string}) {
    const {data: eventData, from: userId, id} = event;

    if (!eventData) {
      const logMessage = `Encrypted event with ID '${id}' from user '${userId}' does not have a 'data' property.`;
      this.logger.error(logMessage, event);

      throw new CryptographyError(CryptographyError.TYPE.NO_DATA_CONTENT, CryptographyError.MESSAGE.NO_DATA_CONTENT);
    }

    // Check the length of the message
    const genericMessageIsTooBig = eventData.text.length > Config.getConfig().MAXIMUM_MESSAGE_LENGTH_RECEIVING;
    const isExternal = typeof eventData.data === 'string';
    const externalMessageIsTooBig =
      isExternal && eventData.data.length > Config.getConfig().MAXIMUM_MESSAGE_LENGTH_RECEIVING;
    if (genericMessageIsTooBig || externalMessageIsTooBig) {
      const error = new ProteusErrors.DecryptError.InvalidMessage('The received message was too big.', 300);
      const errorEvent = EventBuilder.buildIncomingMessageTooBig(event, error, error.code);
      return errorEvent;
    }

    const failedEncryption = eventData.text === CryptographyRepository.REMOTE_ENCRYPTION_FAILURE;
    if (failedEncryption) {
      const decryptionError = new ProteusErrors.DecryptError.InvalidMessage('Sender failed to encrypt a message.', 213);
      return this.handleDecryptionFailure(decryptionError, event);
    }

    try {
      const genericMessage = await this.decryptEvent(event);
      this.logger.info(
        `Decrypted message with ID '${genericMessage.messageId}' for conversation '${event.conversation}'`,
      );
      const mappedMessage = await this.cryptographyMapper.mapGenericMessage(genericMessage, event);
      return mappedMessage;
    } catch (error) {
      const isUnhandledType = error.type === CryptographyError.TYPE.UNHANDLED_TYPE;
      if (isUnhandledType) {
        throw error;
      }

      return this.handleDecryptionFailure(error, event);
    }
  }

  private async createSessionFromPreKey(
    preKey: BackendPreKey,
    {id: userId, domain}: QualifiedId,
    clientId: string,
  ): Promise<CryptoboxSession | void> {
    try {
      const domainText = domain ? ` on domain \'${domain}\'` : ' without domain';
      if (!preKey) {
        this.logger.warn(
          `No pre-key for user '${userId}' ('${clientId}'${domainText}) found. The client might have been deleted.`,
        );
      } else {
        this.logger.log(
          `Initializing session with user '${userId}' (${clientId}${domainText}) with pre-key ID '${preKey.id}'.`,
        );
        const sessionId = this.core.service!.cryptography.constructSessionId({domain, id: userId}, clientId);
        const preKeyArray = base64ToArray(preKey.key);
        return await this.cryptobox!.session_from_prekey(sessionId, preKeyArray.buffer);
      }
    } catch (error) {
      const message = `Pre-key for user '${userId}' ('${clientId}') invalid. Skipping encryption: ${error.message}`;
      this.logger.warn(message, error);
    }
  }

  /**
   * Decrypt an event.
   *
   * @param event Backend event to decrypt
   * @returns Resolves with the decrypted message in ProtocolBuffer format
   */
  private async decryptEvent(event: EventRecord): Promise<GenericMessage> {
    const {data: eventData, from, qualified_from} = event;
    const userId = qualified_from || {domain: '', id: from};
    const cipherTextArray = base64ToArray(eventData.text || eventData.key);
    const cipherText = cipherTextArray.buffer;
    const sessionId = this.core.service!.cryptography.constructSessionId(userId, eventData.sender);

    const plaintext = await this.cryptobox!.decrypt(sessionId, cipherText);
    return GenericMessage.decode(plaintext);
  }

  private handleDecryptionFailure(
    error: AxiosError | CryptographyError | ProteusErrors.DecryptError,
    event: EventRecord,
  ) {
    const errorCode = (error as AxiosError).code
      ? parseInt((error as AxiosError).code, 10)
      : CryptographyRepository.CONFIG.UNKNOWN_DECRYPTION_ERROR_CODE;

    const {data: eventData, from: remoteUserId, time: formattedTime} = event;

    const isDuplicateMessage = error instanceof ProteusErrors.DecryptError.DuplicateMessage;
    const isOutdatedMessage = error instanceof ProteusErrors.DecryptError.OutdatedMessage;
    // We don't need to show these message errors to the user
    if (isDuplicateMessage || isOutdatedMessage) {
      const message = `Message from user ID "${remoteUserId}" at "${formattedTime}" will not be handled because it is outdated or a duplicate.`;
      throw new CryptographyError(CryptographyError.TYPE.UNHANDLED_TYPE, message);
    }

    const isCryptographyError = error instanceof CryptographyError;
    if (isCryptographyError && (error as CryptographyError).type === CryptographyError.TYPE.PREVIOUSLY_STORED) {
      const message = `Message from user ID "${remoteUserId}" at "${formattedTime}" will not be handled because it is already persisted.`;
      throw new CryptographyError(CryptographyError.TYPE.UNHANDLED_TYPE, message);
    }

    const remoteClientId = eventData.sender;

    const isInvalidMessage = error instanceof ProteusErrors.DecryptError.InvalidMessage;
    const isInvalidSignature = error instanceof ProteusErrors.DecryptError.InvalidSignature;
    const isRemoteIdentityChanged = error instanceof ProteusErrors.DecryptError.RemoteIdentityChanged;
    // Session is broken, let's see what's really causing it...
    if (isInvalidMessage || isInvalidSignature) {
      this.logger.error(
        `Session with user '${remoteUserId}' (${remoteClientId}) is broken.\nReset the session for possible fix.`,
      );
    } else if (isRemoteIdentityChanged) {
      this.logger.error(`Remote identity of client '${remoteClientId}' from user '${remoteUserId}' changed`);
    }

    this.logger.warn(
      `Failed to decrypt event from client '${remoteClientId}' of user '${remoteUserId}' (${formattedTime}).\nError Code: '${errorCode}'\nError Message: ${error.message}`,
      error,
    );
    this.reportDecryptionFailure(errorCode);

    return EventBuilder.buildUnableToDecrypt(event, error, errorCode);
  }

  private reportDecryptionFailure(errorCode: number): void {
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.E2EE.FAILED_MESSAGE_DECRYPTION, {
      cause: errorCode,
    });
  }
}
