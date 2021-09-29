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
import {error as StoreEngineError} from '@wireapp/store-engine';
import type {UserPreKeyBundleMap} from '@wireapp/api-client/src/user/';
import {ConversationOtrMessageAddEvent} from '@wireapp/api-client/src/event';
import type {UserClients, NewOTRMessage} from '@wireapp/api-client/src/conversation/';
import {Cryptobox, CryptoboxSession} from '@wireapp/cryptobox';
import {errors as ProteusErrors, keys as ProteusKeys, init as proteusInit} from '@wireapp/proteus';
import {GenericMessage} from '@wireapp/protocol-messaging';
import {WebAppEvents} from '@wireapp/webapp-events';
import type {PreKey as BackendPreKey} from '@wireapp/api-client/src/auth/';
import {StatusCodes as HTTP_STATUS} from 'http-status-codes';

import {getLogger, Logger} from 'Util/Logger';
import {arrayToBase64, base64ToArray} from 'Util/util';
import {constructClientPrimaryKey} from 'Util/StorageUtil';

import {CryptographyMapper} from './CryptographyMapper';
import {Config} from '../Config';
import {EventName} from '../tracking/EventName';
import {ClientEntity} from '../client/ClientEntity';
import {CryptographyError} from '../error/CryptographyError';
import {UserError} from '../error/UserError';
import type {CryptographyService} from './CryptographyService';
import type {StorageRepository, EventRecord} from '../storage';
import {EventBuilder} from '../conversation/EventBuilder';

export interface SignalingKeys {
  enckey: string;
  mackey: string;
}

interface EncryptedPayload {
  cipherText?: string;
  sessionId: string;
}

export interface ClientKeys {
  lastResortKey: BackendPreKey;
  preKeys: BackendPreKey[];
  signalingKeys: SignalingKeys;
}

export class CryptographyRepository {
  cryptobox?: Cryptobox;
  cryptographyMapper: CryptographyMapper;
  cryptographyService: CryptographyService;
  currentClient: ko.Observable<ClientEntity>;
  logger: Logger;
  storageRepository: StorageRepository;

  static get CONFIG() {
    return {
      UNKNOWN_DECRYPTION_ERROR_CODE: 999,
    };
  }

  static get REMOTE_ENCRYPTION_FAILURE(): string {
    return '💣';
  }

  constructor(cryptographyService: CryptographyService, storageRepository: StorageRepository) {
    this.cryptographyService = cryptographyService;
    this.storageRepository = storageRepository;
    this.logger = getLogger('CryptographyRepository');

    this.cryptographyMapper = new CryptographyMapper();

    this.currentClient = undefined;
    this.cryptobox = undefined;
  }

  /**
   * Initializes the repository by creating a new Cryptobox.
   * @returns Resolves with an array of PreKeys
   */
  async initCryptobox(): Promise<ProteusKeys.PreKey[]> {
    await proteusInit();

    const storeEngine = this.storageRepository['storageService']['engine'];
    this.cryptobox = new Cryptobox(storeEngine, 10);

    this.cryptobox.on(Cryptobox.TOPIC.NEW_PREKEYS, async preKeys => {
      const serializedPreKeys = preKeys.map(preKey => this.cryptobox.serialize_prekey(preKey));
      this.logger.log(`Received '${preKeys.length}' new PreKeys.`, serializedPreKeys);

      await this.cryptographyService.putClientPreKeys(this.currentClient().id, serializedPreKeys);
      this.logger.log(`Successfully uploaded '${serializedPreKeys.length}' PreKeys.`, serializedPreKeys);
    });

    this.cryptobox.on(Cryptobox.TOPIC.NEW_SESSION, sessionId => {
      const {userId, clientId, domain} = ClientEntity.dismantleUserClientId(sessionId);
      amplify.publish(WebAppEvents.CLIENT.ADD, userId, {id: clientId}, true, domain);
    });

    return this.cryptobox.load();
  }

  /**
   * Generate all keys needed for client registration.
   * @returns Resolves with an array of last resort key, pre-keys, and signaling keys
   */
  async generateClientKeys(): Promise<ClientKeys> {
    try {
      const lastResortKey = await this.cryptobox.get_serialized_last_resort_prekey();
      const preKeys = await this.cryptobox.get_serialized_standard_prekeys();
      const sigkeys = this.generateSignalingKeys();
      return {lastResortKey, preKeys, signalingKeys: sigkeys};
    } catch (error) {
      throw new Error(`Failed to generate client keys: ${error.message}`);
    }
  }

  /**
   * Get the fingerprint of the local identity.
   * @returns Fingerprint of local identity public key
   */
  getLocalFingerprint(): string {
    return this.cryptobox.getIdentity().public_key.fingerprint();
  }

  /**
   * Get the fingerprint of a remote identity.
   * @param userId ID of user
   * @param clientId ID of client
   * @param preKey PreKey to initialize a session from
   * @returns Resolves with the remote fingerprint
   */
  async getRemoteFingerprint(
    userId: string,
    clientId: string,
    preKey?: BackendPreKey,
    domain?: string,
  ): Promise<string> {
    const cryptoboxSession = preKey
      ? await this.createSessionFromPreKey(preKey, userId, clientId, domain)
      : await this.loadSession(userId, clientId, domain);
    return cryptoboxSession ? cryptoboxSession.fingerprint_remote() : undefined;
  }

  /**
   * Get a pre-key for the given client of the user.
   *
   * @param userId User ID
   * @param clientId Client ID
   * @returns Resolves with a map of pre-keys for the requested clients
   */
  getUserPreKeyByIds(userId: string, clientId: string, domain: string | null): Promise<BackendPreKey> {
    return this.cryptographyService
      .getUserPreKeyByIds(userId, clientId, domain)
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

  /**
   * Get a pre-key for each client in the user client map.
   * @param recipients User client map to request pre-keys for
   * @returns Resolves with a map of pre-keys for the requested clients
   */
  getUsersPreKeys(recipients: UserClients): Promise<UserPreKeyBundleMap> {
    return this.cryptographyService.getUsersPreKeys(recipients).catch(error => {
      const isNotFound = error.code === HTTP_STATUS.NOT_FOUND;
      if (isNotFound) {
        throw new UserError(UserError.TYPE.PRE_KEY_NOT_FOUND, UserError.MESSAGE.PRE_KEY_NOT_FOUND);
      }

      this.logger.error(`Failed to get pre-key from backend: ${error.message}`);
      throw new UserError(UserError.TYPE.REQUEST_FAILURE, UserError.MESSAGE.REQUEST_FAILURE);
    });
  }

  private loadSession(userId: string, clientId: string, domain: string | null): Promise<CryptoboxSession | void> {
    const sessionId = constructClientPrimaryKey(domain, userId, clientId);

    return this.cryptobox.session_load(sessionId).catch(() => {
      return this.getUserPreKeyByIds(userId, clientId, domain).then(preKey => {
        return this.createSessionFromPreKey(preKey, userId, clientId, domain);
      });
    });
  }

  /**
   * Generate the signaling keys (which are used for mobile push notifications).
   * @note Signaling Keys are required by the backend but unimportant for the webapp
   *   (because they are used for iOS or Android push notifications).
   *   Thus this method returns a static Signaling Key Pair.
   */
  private generateSignalingKeys(): SignalingKeys {
    return {
      enckey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
      mackey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
    };
  }

  deleteSession(userId: string, clientId: string, domain: string | null): Promise<string> {
    const sessionId = constructClientPrimaryKey(domain, userId, clientId);
    return this.cryptobox.session_delete(sessionId);
  }

  /**
   * Bundles and encrypts the generic message for all given clients.
   *
   * @param recipients Contains all users and their known clients
   * @param genericMessage Proto buffer message to be encrypted
   * @param payload Object to contain encrypted message payload
   * @returns Resolves with the encrypted payload
   */
  async encryptGenericMessage(
    recipients: UserClients,
    genericMessage: GenericMessage,
    payload: NewOTRMessage<string> = this.constructPayload(this.currentClient().id),
  ) {
    const receivingUsers = Object.keys(recipients).length;
    const encryptLogMessage = `Encrypting message of type '${genericMessage.content}' for '${receivingUsers}' users...`;
    this.logger.log(encryptLogMessage, recipients);

    let {messagePayload, missingRecipients} = await this.buildPayload(recipients, genericMessage, payload);

    if (Object.keys(missingRecipients).length) {
      const reEncryptedMessage = await this.encryptGenericMessageForMissingRecipients(
        missingRecipients,
        genericMessage,
        messagePayload,
      );
      messagePayload = reEncryptedMessage.messagePayload;
      missingRecipients = reEncryptedMessage.missingRecipients;
    }

    const payloadUsers = Object.keys(messagePayload.recipients).length;
    const successLogMessage = `Encrypted message of type '${genericMessage.content}' for '${payloadUsers}' users.`;
    this.logger.log(successLogMessage, messagePayload.recipients);

    const missingUsers = Object.keys(missingRecipients).length;
    if (missingUsers) {
      this.logger.warn(`Failed to encrypt message for '${missingUsers}' users`, missingRecipients);
    }

    return messagePayload;
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
    userId: string,
    clientId: string,
    domain: string | null,
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
        const sessionId = constructClientPrimaryKey(domain, userId, clientId);
        const preKeyArray = base64ToArray(preKey.key);
        return await this.cryptobox.session_from_prekey(sessionId, preKeyArray.buffer);
      }
    } catch (error) {
      const message = `Pre-key for user '${userId}' ('${clientId}') invalid. Skipping encryption: ${error.message}`;
      this.logger.warn(message, error);
    }
  }

  /**
   * @deprecated Method will become obsolete with federation, use `CryptographyRepository.sendCoreMessage` instead.
   */
  private async buildPayload(
    recipients: UserClients,
    genericMessage: GenericMessage,
    messagePayload: NewOTRMessage<string>,
  ): Promise<{messagePayload: NewOTRMessage<string>; missingRecipients: UserClients}> {
    const cipherPayloadPromises = Object.entries(recipients).reduce<Promise<EncryptedPayload>[]>(
      (accumulator, [userId, clientIds]) => {
        if (clientIds && clientIds.length) {
          messagePayload.recipients[userId] ||= {};
          clientIds.forEach(clientId => {
            // TODO(Federation): Update code once federated messages are sent with '@wireapp/core'
            const sessionId = constructClientPrimaryKey(null, userId, clientId);
            const encryptionPromise = this.encryptPayloadForSession(sessionId, genericMessage);

            accumulator.push(encryptionPromise);
          });
        }
        return accumulator;
      },
      [],
    );

    const cipherPayload = await Promise.all(cipherPayloadPromises);
    return this.mapCipherTextToPayload(messagePayload, cipherPayload);
  }

  /**
   * @deprecated Method will become obsolete with federation, use `CryptographyRepository.sendCoreMessage` instead.
   */
  private async encryptGenericMessageForMissingRecipients(
    missingRecipients: UserClients,
    genericMessage: GenericMessage,
    messagePayload: NewOTRMessage<string>,
  ) {
    const userPreKeyMap = await this.getUsersPreKeys(missingRecipients);
    this.logger.info(`Fetched pre-keys for '${Object.keys(userPreKeyMap).length}' users.`, userPreKeyMap);
    const cipherPayloadPromises = [];

    for (const [userId, clientPreKeyMap] of Object.entries(userPreKeyMap)) {
      if (clientPreKeyMap && Object.keys(clientPreKeyMap).length) {
        for (const [clientId, preKeyPayload] of Object.entries(clientPreKeyMap)) {
          if (preKeyPayload) {
            // TODO(Federation): Update code once connections are implemented on the backend
            const sessionId = constructClientPrimaryKey(null, userId, clientId);
            const encryptionPromise = this.encryptPayloadForSession(
              sessionId,
              genericMessage,
              base64ToArray(preKeyPayload.key).buffer,
            );
            cipherPayloadPromises.push(encryptionPromise);
          }
        }
      }
    }

    const cipherPayload = await Promise.all(cipherPayloadPromises);
    return this.mapCipherTextToPayload(messagePayload, cipherPayload);
  }

  private mapCipherTextToPayload(
    messagePayload: NewOTRMessage<string>,
    cipherPayload: EncryptedPayload[],
  ): {messagePayload: NewOTRMessage<string>; missingRecipients: UserClients} {
    const missingRecipients: UserClients = {};

    cipherPayload.forEach(({cipherText, sessionId}) => {
      const {userId, clientId} = ClientEntity.dismantleUserClientId(sessionId);

      if (cipherText) {
        messagePayload.recipients[userId][clientId] = cipherText;
      } else {
        missingRecipients[userId] ||= [];
        missingRecipients[userId].push(clientId);
      }
    });

    return {messagePayload, missingRecipients};
  }

  /**
   * Construct the payload for an encrypted message.
   *
   * @param sender Client ID of message sender
   * @returns Payload to send to backend
   */
  private constructPayload(sender: string): NewOTRMessage<string> {
    return {
      native_push: true,
      recipients: {},
      sender: sender,
    };
  }

  /**
   * Decrypt an event.
   *
   * @param event Backend event to decrypt
   * @returns Resolves with the decrypted message in ProtocolBuffer format
   */
  private async decryptEvent(event: EventRecord): Promise<GenericMessage> {
    const {data: eventData, from: userId} = event;
    const cipherTextArray = base64ToArray(eventData.text || eventData.key);
    const cipherText = cipherTextArray.buffer;
    // TODO(Federation): Update code once messages from remote backends are received
    const sessionId = constructClientPrimaryKey(null, userId, eventData.sender);

    const plaintext = await this.cryptobox.decrypt(sessionId, cipherText);
    return GenericMessage.decode(plaintext);
  }

  /**
   * Encrypt the generic message for a given session.
   * @note We created the convention that whenever we fail to encrypt for a specific client, we send a Bomb Emoji (no joke!)
   *
   * @param sessionId ID of session to encrypt for
   * @param genericMessage Protobuf message
   * @param preKeyBundle Pre-key bundle
   * @returns Contains session ID and encrypted message as base64 encoded string
   */
  private async encryptPayloadForSession(
    sessionId: string,
    genericMessage: GenericMessage,
    preKeyBundle?: ArrayBuffer,
  ): Promise<EncryptedPayload> {
    try {
      const messageArray = GenericMessage.encode(genericMessage).finish();
      const cipherText = await this.cryptobox.encrypt(sessionId, messageArray, preKeyBundle);
      const cipherTextArray = arrayToBase64(cipherText);
      return {cipherText: cipherTextArray, sessionId};
    } catch (error) {
      if (error instanceof StoreEngineError.RecordNotFoundError) {
        this.logger.log(`Session '${sessionId}' needs to get initialized...`);
        return {sessionId};
      }

      const message = `Failed encrypting '${genericMessage.content}' for session '${sessionId}': ${error.message}`;
      this.logger.warn(message, error);
      return {cipherText: CryptographyRepository.REMOTE_ENCRYPTION_FAILURE, sessionId};
    }
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
