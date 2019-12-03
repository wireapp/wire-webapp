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

import {error as StoreEngineError} from '@wireapp/store-engine';
import {IndexedDBEngine} from '@wireapp/store-engine-dexie';
import {Cryptobox, version as cryptoboxVersion} from '@wireapp/cryptobox';
import {errors as ProteusErrors} from '@wireapp/proteus';
import {GenericMessage} from '@wireapp/protocol-messaging';

import {getLogger} from 'Util/Logger';
import {arrayToBase64, base64ToArray, isTemporaryClientAndNonPersistent, zeroPadding} from 'Util/util';

import {CryptographyMapper} from './CryptographyMapper';
import {CryptographyService} from './CryptographyService';

import {Config} from '../Config';
import {WebAppEvents} from '../event/WebApp';
import {EventName} from '../tracking/EventName';
import {ClientEntity} from '../client/ClientEntity';
import {BackendClientError} from '../error/BackendClientError';
import {StorageService} from '../storage/StorageService';

export class CryptographyRepository {
  static get CONFIG() {
    return {
      UNKNOWN_DECRYPTION_ERROR_CODE: 999,
    };
  }

  static get REMOTE_ENCRYPTION_FAILURE() {
    return '💣';
  }

  /**
   * @param {BackendClient} backendClient - Client for the API calls
   * @param {StorageRepository} storageRepository - Repository for all storage interactions
   */
  constructor(backendClient, storageRepository) {
    this.cryptographyService = new CryptographyService(backendClient);
    this.storageRepository = storageRepository;
    this.logger = getLogger('CryptographyRepository');

    this.cryptographyMapper = new CryptographyMapper();

    this.currentClient = undefined;
    this.cryptobox = undefined;
  }

  /**
   * Initializes the repository by loading an existing Cryptobox.
   * @param {Dexie | MemoryStore} database - Dexie or MemoryStore
   * @param {string} [databaseName] - The database name
   * @returns {Promise} Resolves after initialization
   */
  createCryptobox(database, databaseName = database.name) {
    return this._init(database, databaseName).then(() => this.cryptobox.create());
  }

  /**
   * Initializes the repository by creating a new Cryptobox.
   * @param {Dexie | MemoryStore} database - Dexie or MemoryStore
   * @param {string} [databaseName] - The database name
   * @returns {Promise} Resolves after initialization
   */
  loadCryptobox(database, databaseName = database.name) {
    return this._init(database, databaseName).then(() => this.cryptobox.load());
  }

  resetCryptobox(clientEntity) {
    const deleteEverything = clientEntity ? clientEntity.isTemporary() : false;
    const deletePromise = deleteEverything
      ? this.storageRepository.deleteDatabase()
      : this.storageRepository.deleteCryptographyStores();

    return deletePromise
      .catch(databaseError => {
        const message = `Failed cryptography-related db deletion on client validation error: ${databaseError.message}`;
        this.logger.error(message, databaseError);
        throw new z.error.ClientError(z.error.ClientError.TYPE.DATABASE_FAILURE);
      })
      .then(() => deleteEverything);
  }

  /**
   * Initialize the repository.
   *
   * @private
   * @param {Dexie | MemoryStore} database - Dexie instance or MemoryStore
   * @param {string} [databaseName] - The database name
   * @returns {Promise} Resolves after initialization
   */
  async _init(database, databaseName = database.name) {
    let storeEngine;

    if (isTemporaryClientAndNonPersistent()) {
      this.logger.info(`Initializing Cryptobox with encrypted database '${databaseName}'...`);
      storeEngine = await StorageService.getUnitializedEngine();
    } else {
      this.logger.info(`Initializing Cryptobox with database '${databaseName}'...`);
      storeEngine = new IndexedDBEngine();
      try {
        await storeEngine.initWithDb(database, true);
      } catch (error) {
        await storeEngine.initWithDb(database, false);
      }
    }
    this.cryptobox = new Cryptobox(storeEngine, 10);

    this.cryptobox.on(Cryptobox.TOPIC.NEW_PREKEYS, async preKeys => {
      const serializedPreKeys = preKeys.map(preKey => this.cryptobox.serialize_prekey(preKey));

      this.logger.log(`Received '${preKeys.length}' new PreKeys.`, serializedPreKeys);
      await this.cryptographyService.putClientPreKeys(this.currentClient().id, serializedPreKeys);
      this.logger.log(`Successfully uploaded '${serializedPreKeys.length}' PreKeys.`, serializedPreKeys);
    });

    this.cryptobox.on(Cryptobox.TOPIC.NEW_SESSION, sessionId => {
      const {userId, clientId} = ClientEntity.dismantleUserClientId(sessionId);
      amplify.publish(WebAppEvents.CLIENT.ADD, userId, {id: clientId}, true);
    });
  }

  /**
   * Generate all keys needed for client registration.
   * @returns {Promise} Resolves with an array of last resort key, pre-keys, and signaling keys
   */
  generateClientKeys() {
    return Promise.all([
      this.cryptobox.get_serialized_last_resort_prekey(),
      this.cryptobox.get_serialized_standard_prekeys(),
      this._generateSignalingKeys(),
    ]).catch(error => {
      throw new Error(`Failed to generate client keys: ${error.message}`);
    });
  }

  /**
   * Get the fingerprint of the local identity.
   * @returns {string} Fingerprint of local identity public key
   */
  getLocalFingerprint() {
    return this._formatFingerprint(this.cryptobox.identity.public_key.fingerprint());
  }

  /**
   * Get the fingerprint of a remote identity.
   * @param {string} userId - ID of user
   * @param {string} clientId - ID of client
   * @param {PreKey} [preKey] - PreKey to initialize a session from
   * @returns {Promise} Resolves with the remote fingerprint
   */
  async getRemoteFingerprint(userId, clientId, preKey) {
    const cryptoboxSession = preKey
      ? await this._createSessionFromPreKey(preKey, userId, clientId)
      : await this._loadSession(userId, clientId);
    return cryptoboxSession ? this._formatFingerprint(cryptoboxSession.fingerprint_remote()) : '';
  }

  _formatFingerprint(fingerprint) {
    return zeroPadding(fingerprint, 16).match(/.{1,2}/g) || [];
  }

  /**
   * Get a pre-key for the given client of the user.
   *
   * @param {string} userId - User ID
   * @param {string} clientId - Client ID
   * @returns {Promise} Resolves with a map of pre-keys for the requested clients
   */
  getUserPreKeyByIds(userId, clientId) {
    return this.cryptographyService
      .getUserPreKeyByIds(userId, clientId)
      .then(response => response.prekey)
      .catch(error => {
        const isNotFound = error.code === BackendClientError.STATUS_CODE.NOT_FOUND;
        if (isNotFound) {
          throw new z.error.UserError(z.error.UserError.TYPE.PRE_KEY_NOT_FOUND);
        }

        this.logger.error(`Failed to get pre-key from backend: ${error.message}`);
        throw new z.error.UserError(z.error.UserError.TYPE.REQUEST_FAILURE);
      });
  }

  /**
   * Get a pre-key for each client in the user client map.
   * @param {Object} recipients - User client map to request pre-keys for
   * @returns {Promise} Resolves with a map of pre-keys for the requested clients
   */
  getUsersPreKeys(recipients) {
    return this.cryptographyService.getUsersPreKeys(recipients).catch(error => {
      const isNotFound = error.code === BackendClientError.STATUS_CODE.NOT_FOUND;
      if (isNotFound) {
        throw new z.error.UserError(z.error.UserError.TYPE.PRE_KEY_NOT_FOUND);
      }

      this.logger.error(`Failed to get pre-key from backend: ${error.message}`);
      throw new z.error.UserError(z.error.UserError.TYPE.REQUEST_FAILURE);
    });
  }

  _loadSession(userId, clientId) {
    const sessionId = this._constructSessionId(userId, clientId);

    return this.cryptobox.session_load(sessionId).catch(() => {
      return this.getUserPreKeyByIds(userId, clientId).then(preKey => {
        return this._createSessionFromPreKey(preKey, userId, clientId);
      });
    });
  }

  /**
   * Generate the signaling keys (which are used for mobile push notifications).
   * @note Signaling Keys are  required by the backend but unimportant for the webapp
   *   (because they are used for iOS or Android push notifications).
   *   Thus this method returns a static Signaling Key Pair.
   *
   * @private
   * @returns {Object} Object containing the signaling keys
   */
  _generateSignalingKeys() {
    return {
      enckey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
      mackey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
    };
  }

  /**
   * Construct a session ID.
   *
   * @todo Make public
   * @private
   * @param {string} userId - User ID for the remote participant
   * @param {string} clientId - Client ID of the remote participant
   * @returns {string} Session ID
   */
  _constructSessionId(userId, clientId) {
    return `${userId}@${clientId}`;
  }

  deleteSession(userId, clientId) {
    const sessionId = this._constructSessionId(userId, clientId);
    return this.cryptobox.session_delete(sessionId);
  }

  /**
   * Bundles and encrypts the generic message for all given clients.
   *
   * @param {Object} recipients - Contains all users and their known clients
   * @param {GenericMessage} genericMessage - Proto buffer message to be encrypted
   * @param {Object} [payload={sender: string, recipients: {}, native_push: true}] - Object to contain encrypted message payload
   * @returns {Promise} Resolves with the encrypted payload
   */
  async encryptGenericMessage(recipients, genericMessage, payload = this._constructPayload(this.currentClient().id)) {
    const receivingUsers = Object.keys(recipients).length;
    const encryptLogMessage = `Encrypting message of type '${genericMessage.content}' for '${receivingUsers}' users.`;
    this.logger.log(encryptLogMessage, recipients);

    let {messagePayload, missingRecipients} = await this._encryptGenericMessage(recipients, genericMessage, payload);

    if (Object.keys(missingRecipients).length) {
      const reEncryptedMessage = await this._encryptGenericMessageForMissingRecipients(
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
   * @param {Object} event - Backend event to decrypt
   * @returns {Promise} Resolves with decrypted and mapped message
   */
  async handleEncryptedEvent(event) {
    const {data: eventData, from: userId, id} = event;

    if (!eventData) {
      const logMessage = `Encrypted event with ID '${id}' from user '${userId}' does not have a 'data' property.`;
      this.logger.error(logMessage, event);

      throw new z.error.CryptographyError(z.error.CryptographyError.TYPE.NO_DATA_CONTENT);
    }

    // Check the length of the message
    const genericMessageIsTooBig = eventData.text.length > Config.MAXIMUM_MESSAGE_LENGTH_RECEIVING;
    const isExternal = typeof eventData.data === 'string';
    const externalMessageIsTooBig = isExternal && eventData.data.length > Config.MAXIMUM_MESSAGE_LENGTH_RECEIVING;
    if (genericMessageIsTooBig || externalMessageIsTooBig) {
      const error = new ProteusErrors.DecryptError.InvalidMessage('The received message was too big.', 300);
      const errorEvent = z.conversation.EventBuilder.buildIncomingMessageTooBig(event, error, error.code);
      return errorEvent;
    }

    const failedEncryption = eventData.text === CryptographyRepository.REMOTE_ENCRYPTION_FAILURE;
    if (failedEncryption) {
      const decryptionError = new ProteusErrors.DecryptError.InvalidMessage('Sender failed to encrypt a message.', 213);
      return this._handleDecryptionFailure(decryptionError, event);
    }

    try {
      const genericMessage = await this._decryptEvent(event);
      const mappedMessage = await this.cryptographyMapper.mapGenericMessage(genericMessage, event);
      return mappedMessage;
    } catch (error) {
      const isUnhandledType = error.type === z.error.CryptographyError.TYPE.UNHANDLED_TYPE;
      if (isUnhandledType) {
        throw error;
      }

      return this._handleDecryptionFailure(error, event);
    }
  }

  async _createSessionFromPreKey(preKey, userId, clientId) {
    try {
      if (!preKey) {
        Raygun.send(new Error('Failed to create session: No pre-key found'));
        this.logger.warn(`No pre-key for user '${userId}' ('${clientId}') found. The client might have been deleted.`);
      } else {
        this.logger.log(`Initializing session with user '${userId}' (${clientId}) with pre-key ID '${preKey.id}'.`);
        const sessionId = this._constructSessionId(userId, clientId);
        const preKeyArray = await base64ToArray(preKey.key);
        return this.cryptobox.session_from_prekey(sessionId, preKeyArray.buffer);
      }
    } catch (error) {
      Raygun.send(new Error(`Failed to create session: ${error.message}`));
      const message = `Pre-key for user '${userId}' ('${clientId}') invalid. Skipping encryption: ${error.message}`;
      this.logger.warn(message, error);
    }
  }

  _encryptGenericMessage(recipients, genericMessage, messagePayload) {
    return Promise.resolve()
      .then(() => {
        const cipherPayloadPromises = [];

        Object.entries(recipients).forEach(([userId, clientIds]) => {
          if (clientIds && clientIds.length) {
            messagePayload.recipients[userId] = messagePayload.recipients[userId] || {};
            clientIds.forEach(clientId => {
              const sessionId = this._constructSessionId(userId, clientId);
              const encryptionPromise = this._encryptPayloadForSession(sessionId, genericMessage);

              cipherPayloadPromises.push(encryptionPromise);
            });
          }
        });

        return Promise.all(cipherPayloadPromises);
      })
      .then(cipherPayload => this._mapCipherTextToPayload(messagePayload, cipherPayload));
  }

  async _encryptGenericMessageForMissingRecipients(missingRecipients, genericMessage, messagePayload) {
    const userPreKeyMap = await this.getUsersPreKeys(missingRecipients);
    this.logger.info(`Fetched pre-keys for '${Object.keys(userPreKeyMap).length}' users.`, userPreKeyMap);
    const cipherPayloadPromises = [];

    for (const [userId, clientPreKeyMap] of Object.entries(userPreKeyMap)) {
      if (clientPreKeyMap && Object.keys(clientPreKeyMap).length) {
        for (const [clientId, preKeyPayload] of Object.entries(clientPreKeyMap)) {
          if (preKeyPayload) {
            const sessionId = this._constructSessionId(userId, clientId);
            const encryptionPromise = base64ToArray(preKeyPayload.key).then(payloadArray =>
              this._encryptPayloadForSession(sessionId, genericMessage, payloadArray.buffer),
            );
            cipherPayloadPromises.push(encryptionPromise);
          }
        }
      }
    }

    const cipherPayload = await Promise.all(cipherPayloadPromises);
    return this._mapCipherTextToPayload(messagePayload, cipherPayload);
  }

  _mapCipherTextToPayload(messagePayload, cipherPayload) {
    const missingRecipients = {};

    cipherPayload.forEach(({cipherText, sessionId}) => {
      const {userId, clientId} = ClientEntity.dismantleUserClientId(sessionId);

      if (cipherText) {
        messagePayload.recipients[userId][clientId] = cipherText;
      } else {
        missingRecipients[userId] = missingRecipients[userId] || [];
        missingRecipients[userId].push(clientId);
      }
    });

    return {messagePayload, missingRecipients};
  }

  /**
   * Construct the payload for an encrypted message.
   *
   * @private
   * @param {string} sender - Client ID of message sender
   * @returns {Object} Payload to send to backend
   */
  _constructPayload(sender) {
    return {
      native_push: true,
      recipients: {},
      sender: sender,
    };
  }

  /**
   * Decrypt an event.
   *
   * @private
   * @param {Object} event - Backend event to decrypt
   * @returns {Promise} Resolves with the decrypted message in ProtocolBuffer format
   */
  async _decryptEvent(event) {
    const {data: eventData, from: userId} = event;
    const cipherTextArray = await base64ToArray(eventData.text || eventData.key);
    const cipherText = cipherTextArray.buffer;
    const sessionId = this._constructSessionId(userId, eventData.sender);

    const plaintext = await this.cryptobox.decrypt(sessionId, cipherText);
    return GenericMessage.decode(plaintext);
  }

  /**
   * Encrypt the generic message for a given session.
   * @note We created the convention that whenever we fail to encrypt for a specific client, we send a Bomb Emoji (no joke!)
   *
   * @private
   * @param {string} sessionId - ID of session to encrypt for
   * @param {GenericMessage} genericMessage - Protobuf message
   * @param {Object} [preKeyBundle] - Pre-key bundle
   * @returns {Object} Contains session ID and encrypted message as base64 encoded string
   */
  async _encryptPayloadForSession(sessionId, genericMessage, preKeyBundle) {
    try {
      const messageArray = GenericMessage.encode(genericMessage).finish();
      const cipherText = await this.cryptobox.encrypt(sessionId, messageArray, preKeyBundle);
      const cipherTextArray = await arrayToBase64(cipherText);
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

  _handleDecryptionFailure(error, event) {
    // Get error information
    const errorCode = error.code || CryptographyRepository.CONFIG.UNKNOWN_DECRYPTION_ERROR_CODE;

    const {data: eventData, from: remoteUserId, time: formattedTime} = event;

    const isDuplicateMessage = error instanceof ProteusErrors.DecryptError.DuplicateMessage;
    const isOutdatedMessage = error instanceof ProteusErrors.DecryptError.OutdatedMessage;
    // We don't need to show these message errors to the user
    if (isDuplicateMessage || isOutdatedMessage) {
      const message = `Message from user ID "${remoteUserId}" at "${formattedTime}" will not be handled because it is outdated or a duplicate.`;
      throw new z.error.CryptographyError(z.error.CryptographyError.TYPE.UNHANDLED_TYPE, message);
    }

    const isCryptographyError = error instanceof z.error.CryptographyError;
    if (isCryptographyError && error.type === z.error.CryptographyError.TYPE.PREVIOUSLY_STORED) {
      const message = `Message from user ID "${remoteUserId}" at "${formattedTime}" will not be handled because it is already persisted.`;
      throw new z.error.CryptographyError(z.error.CryptographyError.TYPE.UNHANDLED_TYPE, message);
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
    this._reportDecryptionFailure(error, event);

    return z.conversation.EventBuilder.buildUnableToDecrypt(event, error, errorCode);
  }

  /**
   * Report decryption error to Localytics and stack traces to Raygun.
   *
   * @private
   * @param {Error} error - Error from event decryption
   * @param {Object} eventData - Event data
   * @param {string} eventData.type - Event type
   * @returns {undefined} No return value
   */
  _reportDecryptionFailure(error, {type: eventType}) {
    amplify.publish(WebAppEvents.ANALYTICS.EVENT, EventName.E2EE.FAILED_MESSAGE_DECRYPTION, {
      cause: error.code || error.message,
    });

    const customData = {
      clientLocalClass: this.currentClient().class,
      clientLocalType: this.currentClient().type,
      cryptoboxVersion,
      errorCode: error.code,
      eventType: eventType,
    };

    const raygunError = new Error(`Decryption failed: ${error.code || error.message}`);
    raygunError.stack = error.stack;
    Raygun.send(raygunError, customData);
  }
}
