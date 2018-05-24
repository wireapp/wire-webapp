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

'use strict';

window.z = window.z || {};
window.z.cryptography = z.cryptography || {};

z.cryptography.CryptographyRepository = class CryptographyRepository {
  static get CONFIG() {
    return {
      UNKNOWN_DECRYPTION_ERROR_CODE: 999,
    };
  }

  static get REMOTE_ENCRYPTION_FAILURE() {
    return '💣';
  }

  /**
   * Construct a new Cryptography repository.
   * @param {z.cryptography.CryptographyService} cryptographyService - Backend REST API cryptography service implementation
   * @param {z.storage.StorageRepository} storageRepository - Repository for all storage interactions
   */
  constructor(cryptographyService, storageRepository) {
    this.cryptographyService = cryptographyService;
    this.storageRepository = storageRepository;
    this.logger = new z.util.Logger('z.cryptography.CryptographyRepository', z.config.LOGGER.OPTIONS);

    this.cryptographyMapper = new z.cryptography.CryptographyMapper();

    this.currentClient = undefined;
    this.cryptobox = undefined;
  }

  /**
   * Initializes the repository by loading an existing Cryptobox.
   * @param {Object} database - Database object
   * @returns {Promise} Resolves after initialization
   */
  createCryptobox(database) {
    return this._init(database).then(() => this.cryptobox.create());
  }

  /**
   * Initializes the repository by creating a new Cryptobox.
   * @param {Object} database - Database object
   * @returns {Promise} Resolves after initialization
   */
  loadCryptobox(database) {
    return this._init(database).then(() => this.cryptobox.load());
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
        throw new z.client.ClientError(z.client.ClientError.TYPE.DATABASE_FAILURE);
      })
      .then(() => deleteEverything);
  }

  /**
   * Initialize the repository.
   *
   * @private
   * @param {Object} database - Dexie instance
   * @returns {Promise} Resolves after initialization
   */
  _init(database) {
    return Promise.resolve().then(() => {
      this.logger.info(`Initializing Cryptobox with database '${database.name}'...`);
      const storeEngine = new StoreEngine.IndexedDBEngine();
      storeEngine.initWithDb(database);
      this.cryptobox = new cryptobox.Cryptobox(storeEngine, 10);

      this.cryptobox.on(cryptobox.Cryptobox.TOPIC.NEW_PREKEYS, preKeys => {
        const serializedPreKeys = preKeys.map(preKey => this.cryptobox.serialize_prekey(preKey));

        this.logger.log(`Received '${preKeys.length}' new PreKeys.`, serializedPreKeys);
        return this.cryptographyService.putClientPreKeys(this.currentClient().id, serializedPreKeys).then(() => {
          this.logger.log(`Successfully uploaded '${serializedPreKeys.length}' PreKeys.`, serializedPreKeys);
        });
      });

      this.cryptobox.on(cryptobox.Cryptobox.TOPIC.NEW_SESSION, sessionId => {
        const {userId, clientId} = z.client.ClientEntity.dismantleUserClientId(sessionId);
        amplify.publish(z.event.WebApp.CLIENT.ADD, userId, {id: clientId}, true);
      });
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
   * @returns {Promise} Resolves with the remote fingerprint
   */
  getRemoteFingerprint(userId, clientId) {
    return this._loadSession(userId, clientId).then(cryptoboxSession => {
      return cryptoboxSession ? this._formatFingerprint(cryptoboxSession.fingerprint_remote()) : '';
    });
  }

  _formatFingerprint(fingerprint) {
    return z.util.zeroPadding(fingerprint, 16).match(/.{1,2}/g) || [];
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
        const isNotFound = error.code === z.service.BackendClientError.STATUS_CODE.NOT_FOUND;
        if (isNotFound) {
          throw new z.user.UserError(z.user.UserError.TYPE.PRE_KEY_NOT_FOUND);
        }

        this.logger.error(`Failed to get pre-key from backend: ${error.message}`);
        throw new z.user.UserError(z.user.UserError.TYPE.REQUEST_FAILURE);
      });
  }

  /**
   * Get a pre-key for each client in the user client map.
   * @param {Object} recipients - User client map to request pre-keys for
   * @returns {Promise} Resolves with a map of pre-keys for the requested clients
   */
  getUsersPreKeys(recipients) {
    return this.cryptographyService.getUsersPreKeys(recipients).catch(error => {
      const isNotFound = error.code === z.service.BackendClientError.STATUS_CODE.NOT_FOUND;
      if (isNotFound) {
        throw new z.user.UserError(z.user.UserError.TYPE.PRE_KEY_NOT_FOUND);
      }

      this.logger.error(`Failed to get pre-key from backend: ${error.message}`);
      throw new z.user.UserError(z.user.UserError.TYPE.REQUEST_FAILURE);
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
   * @param {z.proto.GenericMessage} genericMessage - Proto buffer message to be encrypted
   * @param {Object} [payload={sender: string, recipients: {}, native_push: true}] - Object to contain encrypted message payload
   * @returns {Promise} Resolves with the encrypted payload
   */
  encryptGenericMessage(recipients, genericMessage, payload = this._constructPayload(this.currentClient().id)) {
    const cipherPayloadPromises = [];

    for (const userId in recipients) {
      const client_ids = recipients[userId];

      payload.recipients[userId] = payload.recipients[userId] || {};
      client_ids.forEach(client_id => {
        const sessionId = this._constructSessionId(userId, client_id);
        cipherPayloadPromises.push(this._encryptPayloadForSession(sessionId, genericMessage));
      });
    }

    const receivingUsers = Object.keys(payload.recipients).length;
    const logMessage = `Encrypting message of type '${genericMessage.content}' for '${receivingUsers}' users.`;
    this.logger.log(logMessage, payload.recipients);

    return Promise.all(cipherPayloadPromises)
      .then(cipherPayloads => {
        const recipientsWithMissingSessions = {};

        cipherPayloads.forEach(({cipherText, sessionId}) => {
          const {userId, clientId} = z.client.ClientEntity.dismantleUserClientId(sessionId);
          if (!cipherText) {
            recipientsWithMissingSessions[userId] = recipientsWithMissingSessions[userId] || [];
            recipientsWithMissingSessions[userId].push(clientId);
          }

          payload.recipients[userId][clientId] = cipherText;
        });

        return this._encryptGenericMessageForNewSessions(recipientsWithMissingSessions, genericMessage);
      })
      .then(additionalCipherPayloads => {
        additionalCipherPayloads.forEach(({cipherText, sessionId}) => {
          const {userId, clientId} = z.client.ClientEntity.dismantleUserClientId(sessionId);
          payload.recipients[userId] = payload.recipients[userId] || {};
          payload.recipients[userId][clientId] = cipherText;
        });

        return payload;
      });
  }

  /**
   * Handle an encrypted event.
   * @param {Object} event - Backend event to decrypt
   * @returns {Promise} Resolves with decrypted and mapped message
   */
  handleEncryptedEvent(event) {
    const {data: eventData, from: userId, id} = event;

    if (!eventData) {
      const logMessage = `Encrypted event with ID '${id}' from user '${userId}' does not have a 'data' property.`;
      this.logger.error(logMessage, event);

      const error = new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.NO_DATA_CONTENT);
      return Promise.reject(error);
    }

    // Check the length of the message
    const genericMessageIsTooBig = eventData.text.length > z.config.MAXIMUM_MESSAGE_LENGTH_RECEIVING;
    const isExternal = typeof eventData.data === 'string';
    const externalMessageIsTooBig = isExternal && eventData.data.length > z.config.MAXIMUM_MESSAGE_LENGTH_RECEIVING;
    if (genericMessageIsTooBig || externalMessageIsTooBig) {
      const error = new Proteus.errors.DecryptError.InvalidMessage('The received message was too big.', 300);
      const errorEvent = z.conversation.EventBuilder.buildIncomingMessageTooBig(event, error, error.code);
      return Promise.resolve(errorEvent);
    }

    const failedEncryption = eventData.text === CryptographyRepository.REMOTE_ENCRYPTION_FAILURE;
    if (failedEncryption) {
      const decryptionError = new Proteus.errors.DecryptError.InvalidMessage(
        'Sender failed to encrypt a message.',
        213
      );
      return Promise.resolve(this._handleDecryptionFailure(decryptionError, event));
    }

    return this._decryptEvent(event)
      .then(genericMessage => this.cryptographyMapper.mapGenericMessage(genericMessage, event))
      .catch(error => {
        const isUnhandledType = error.type === z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE;
        if (isUnhandledType) {
          throw error;
        }

        return this._handleDecryptionFailure(error, event);
      });
  }

  _createSessionFromPreKey(preKey, userId, clientId) {
    return Promise.resolve()
      .then(() => {
        if (preKey) {
          this.logger.log(`Initializing session with user '${userId}' (${clientId}) with pre-key ID '${preKey.id}'.`);
          const sessionId = this._constructSessionId(userId, clientId);

          return this.cryptobox.session_from_prekey(sessionId, z.util.base64ToArray(preKey.key).buffer);
        }

        Raygun.send(new Error('Failed to create session: No pre-key found'));
        this.logger.warn(`No pre-key for user '${userId}' ('${clientId}') found. The client might have been deleted.`);
        return undefined;
      })
      .catch(error => {
        Raygun.send(new Error(`Failed to create session: ${error.message}`));

        const message = `Pre-key for user '${userId}' ('${clientId}') invalid. Skipping encryption: ${error.message}`;
        this.logger.warn(message, error);
        return undefined;
      });
  }

  _encryptGenericMessageForNewSessions(recipientsWithMissingSessions, genericMessage) {
    if (Object.keys(recipientsWithMissingSessions).length) {
      return this.getUsersPreKeys(recipientsWithMissingSessions)
        .then(userPreKeyMap => {
          this.logger.info(`Fetched pre-keys for '${Object.keys(userPreKeyMap).length}' users.`, userPreKeyMap);

          const newSessionPromises = [];

          for (const userId in userPreKeyMap) {
            const clientPreKeyMap = userPreKeyMap[userId];

            for (const clientId in clientPreKeyMap) {
              const preKey = clientPreKeyMap[clientId];
              newSessionPromises.push(this._createSessionFromPreKey(preKey, userId, clientId));
            }
          }

          return Promise.all(newSessionPromises);
        })
        .then(cryptoboxSessions => {
          const cipherPayloadPromises = [];

          cryptoboxSessions.filter(cryptoboxSession => cryptoboxSession).forEach(cryptoboxSession => {
            cipherPayloadPromises.push(this._encryptPayloadForSession(cryptoboxSession.id, genericMessage));
          });

          return Promise.all(cipherPayloadPromises);
        });
    }
    return Promise.resolve([]);
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
  _decryptEvent(event) {
    const {data: eventData, from: userId} = event;
    const cipherText = z.util.base64ToArray(eventData.text || eventData.key).buffer;
    const sessionId = this._constructSessionId(userId, eventData.sender);

    return this.cryptobox.decrypt(sessionId, cipherText).then(plaintext => z.proto.GenericMessage.decode(plaintext));
  }

  /**
   * Encrypt the generic message for a given session.
   * @note We created the convention that whenever we fail to encrypt for a specific client, we send a Bomb Emoji (no joke!)
   *
   * @private
   * @param {string} sessionId - ID of session to encrypt for
   * @param {z.proto.GenericMessage} genericMessage - ProtoBuffer message
   * @returns {Object} Contains session ID and encrypted message as base64 encoded string
   */
  _encryptPayloadForSession(sessionId, genericMessage) {
    return this.cryptobox
      .encrypt(sessionId, genericMessage.toArrayBuffer())
      .then(cipherText => ({cipherText: z.util.arrayToBase64(cipherText), sessionId}))
      .catch(error => {
        if (error instanceof StoreEngine.error.RecordNotFoundError) {
          this.logger.log(`Session '${sessionId}' needs to get initialized...`);
          return {sessionId};
        }

        const message = `Failed encrypting '${genericMessage.content}' for session '${sessionId}': ${error.message}`;
        this.logger.warn(message, error);
        return {cipherText: CryptographyRepository.REMOTE_ENCRYPTION_FAILURE, sessionId};
      });
  }

  _handleDecryptionFailure(error, event) {
    // Get error information
    const errorCode = error.code || CryptographyRepository.CONFIG.UNKNOWN_DECRYPTION_ERROR_CODE;

    const {data: eventData, from: remoteUserId, time: formattedTime} = event;

    const isDuplicateMessage = error instanceof Proteus.errors.DecryptError.DuplicateMessage;
    const isOutdatedMessage = error instanceof Proteus.errors.DecryptError.OutdatedMessage;
    // We don't need to show these message errors to the user
    if (isDuplicateMessage || isOutdatedMessage) {
      throw new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE);
    }

    const isCryptographyError = error instanceof z.cryptography.CryptographyError;
    if (isCryptographyError && error.type === z.cryptography.CryptographyError.TYPE.PREVIOUSLY_STORED) {
      throw new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE);
    }

    const remoteClientId = eventData.sender;

    const isInvalidMessage = error instanceof Proteus.errors.DecryptError.InvalidMessage;
    const isInvalidSignature = error instanceof Proteus.errors.DecryptError.InvalidSignature;
    const isRemoteIdentityChanged = error instanceof Proteus.errors.DecryptError.RemoteIdentityChanged;
    // Session is broken, let's see what's really causing it...
    if (isInvalidMessage || isInvalidSignature) {
      this.logger.error(
        `Session with user '${remoteUserId}' (${remoteClientId}) is broken.\nReset the session for possible fix.`
      );
    } else if (isRemoteIdentityChanged) {
      this.logger.error(`Remote identity of client '${remoteClientId}' from user '${remoteUserId}' changed`);
    }

    this.logger.warn(
      `Failed to decrypt event from client '${remoteClientId}' of user '${remoteUserId}' (${formattedTime}).\nError Code: '${errorCode}'\nError Message: ${
        error.message
      }`,
      error
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
   * @param {string} userId - Remote user ID
   * @param {string} eventType - Event type
   * @returns {undefined} No return value
   */
  _reportDecryptionFailure(error, {data: eventData, type: eventType}) {
    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.E2EE.FAILED_MESSAGE_DECRYPTION, {
      cause: error.code || error.message,
    });

    const customData = {
      clientLocalClass: this.currentClient().class,
      clientLocalType: this.currentClient().type,
      cryptoboxVersion: cryptobox.version,
      errorCode: error.code,
      eventType: eventType,
    };

    const raygunError = new Error(`Decryption failed: ${error.code || error.message}`);
    raygunError.stack = error.stack;
    Raygun.send(raygunError, customData);
  }
};
