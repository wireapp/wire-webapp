/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
   * @param {z.cryptography.CryptographyService} cryptography_service - Backend REST API cryptography service implementation
   * @param {z.storage.StorageRepository} storage_repository - Repository for all storage interactions
   */
  constructor(cryptography_service, storage_repository) {
    this.cryptography_service = cryptography_service;
    this.storage_repository = storage_repository;
    this.logger = new z.util.Logger('z.cryptography.CryptographyRepository', z.config.LOGGER.OPTIONS);

    this.cryptography_mapper = new z.cryptography.CryptographyMapper();

    this.current_client = undefined;
    this.cryptobox = undefined;
  }

  /**
   * Initialize the repository.
   * @param {Object} db - Database object
   * @returns {Promise} Resolves with the repository after initialization
   */
  init(db) {
    return Promise.resolve()
      .then(() => {
        this.logger.info(`Initializing Cryptobox with database '${db.name}'...`);
        this.cryptobox = new cryptobox.Cryptobox(new cryptobox.store.IndexedDB(db), 10);

        this.cryptobox.on(cryptobox.Cryptobox.TOPIC.NEW_PREKEYS, (pre_keys) => {
          const serialized_pre_keys = pre_keys.map((pre_key) => {
            return this.cryptobox.serialize_prekey(pre_key);
          });

          this.logger.log(`Received '${pre_keys.length}' new PreKeys.`, serialized_pre_keys);
          return this.cryptography_service.put_client_prekeys(this.current_client().id, serialized_pre_keys)
            .then(() => {
              this.logger.log(`Successfully uploaded '${serialized_pre_keys.length}' PreKeys.`);
            });
        });

        this.cryptobox.on(cryptobox.Cryptobox.TOPIC.NEW_SESSION, (session_id) => {
          const {user_id, client_id} = z.client.Client.dismantle_user_client_id(session_id);
          amplify.publish(z.event.WebApp.CLIENT.ADD, user_id, new z.client.Client({id: client_id}));
        });

        return this.cryptobox.init();
      })
      .then(() => {
        return this;
      });
  }

  /**
   * Generate all keys needed for client registration.
   * @returns {Promise} Resolves with an array of last resort key, pre-keys, and signaling keys
   */
  generate_client_keys() {
    return Promise.all([
      this.cryptobox.get_serialized_last_resort_prekey(),
      this.cryptobox.get_serialized_standard_prekeys(),
      this._generate_signaling_keys(),
    ])
      .catch(function(error) {
        throw new Error(`Failed to generate client keys: ${error.message}`);
      });
  }

  /**
   * Get the fingerprint of the local identity.
   * @returns {string} Fingerprint of local identity public key
   */
  get_local_fingerprint() {
    return this.cryptobox.identity.public_key.fingerprint();
  }

  /**
   * Get the fingerprint of a remote identity.
   * @param {string} user_id - ID of user
   * @param {string} client_id - ID of client
   * @returns {Promise} Resolves with the remote fingerprint
   */
  get_remote_fingerprint(user_id, client_id) {
    return this._load_session(user_id, client_id)
      .then((cryptobox_session) => cryptobox_session.fingerprint_remote());
  }

  /**
   * Get a pre-key for client of in the user client map.
   * @param {Object} recipients - User client map to request pre-keys for
   * @returns {Promise} Resolves with a map of pre-keys for the requested clients
   */
  get_users_pre_keys(recipients) {
    return this.cryptography_service.get_users_pre_keys(recipients)
      .catch((error) => {
        if (error.code === z.service.BackendClientError.STATUS_CODE.NOT_FOUND) {
          throw new z.user.UserError(z.user.UserError.prototype.TYPE.PRE_KEY_NOT_FOUND);
        }
        this.logger.error(`Failed to get pre-key from backend: ${error.message}`);
        throw new z.user.UserError(z.user.UserError.prototype.TYPE.REQUEST_FAILURE);
      });
  }

  _load_session(user_id, client_id) {
    return this.cryptobox.session_load(this._construct_session_id(user_id, client_id))
      .catch(() => {
        return this.get_users_pre_keys({[user_id]: [client_id]})
          .then((user_pre_key_map) => {
            return this._session_from_encoded_prekey_payload(user_pre_key_map[user_id][client_id], user_id, client_id);
          });
      });
  }

  /**
   * Generate the signaling keys (which are used for mobile push notifications).
   * @note Signaling Keys are unimportant for the webapp (because they are used for iOS or Android push notifications) but required by the backend.
   *   Thus this method returns a static Signaling Key Pair.
   *
   * @private
   * @returns {Object} Object containing the signaling keys
   */
  _generate_signaling_keys() {
    return {
      enckey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
      mackey: 'Wuec0oJi9/q9VsgOil9Ds4uhhYwBT+CAUrvi/S9vcz0=',
    };
  }

  /**
   * Create a map of all local sessions.
   * @returns {Object} Object of users each containing an array of local sessions
   */
  create_user_session_map() {
    const user_session_map = {};
    for (const session_id in this.storage_repository.sessions) {
      const {user_id, client_id} = z.client.Client.dismantle_user_client_id(session_id);
      user_session_map[user_id] = user_session_map[user_id] || [];
      user_session_map[user_id].push(client_id);
    }
    return user_session_map;
  }

  /**
   * Construct a session ID.
   * @todo Make public
   * @private
   * @param {string} user_id - User ID for the remote participant
   * @param {string} client_id - Client ID of the remote participant
   * @returns {string} Session ID
   */
  _construct_session_id(user_id, client_id) {
    return `${user_id}@${client_id}`;
  }

  delete_session(user_id, client_id) {
    return this.cryptobox.session_delete(this._construct_session_id(user_id, client_id));
  }

  /**
   * Bundles and encrypts the generic message for all given clients.
   *
   * @param {Object} recipients - Contains all users and their known clients
   * @param {z.proto.GenericMessage} generic_message - Proto buffer message to be encrypted
   * @param {Object} [payload={sender: string, recipients: {}, native_push: true}] - Object to contain encrypted message payload
   * @returns {Promise} Resolves with the encrypted payload
   */
  encrypt_generic_message(recipients, generic_message, payload = this._construct_payload(this.current_client().id)) {
    const cipher_payload_promises = [];

    for (const user_id in recipients) {
      const client_ids = recipients[user_id];
      payload.recipients[user_id] = payload.recipients[user_id] || {};
      client_ids.forEach((client_id) => {
        cipher_payload_promises.push(this._encrypt_payload_for_session(this._construct_session_id(user_id, client_id), generic_message));
      });
    }

    this.logger.log(`Encrypting message of type '${generic_message.content}' for '${Object.keys(payload.recipients).length}' users.`, payload.recipients);

    return Promise.all(cipher_payload_promises)
      .then((cipher_payloads) => {
        const recipients_for_missing_sessions = {};

        cipher_payloads.forEach(({cipher_text, session_id}) => {
          const {user_id, client_id} = z.client.Client.dismantle_user_client_id(session_id);
          if (cipher_text) {
            return payload.recipients[user_id][client_id] = cipher_text;
          }
          recipients_for_missing_sessions[user_id] = recipients_for_missing_sessions[user_id] || [];
          recipients_for_missing_sessions[user_id].push(client_id);
        });

        return this._encrypt_generic_message_for_new_sessions(recipients_for_missing_sessions, generic_message);
      })
      .then((additional_cipher_payloads) => {
        additional_cipher_payloads.forEach(({cipher_text, session_id}) => {
          const {user_id, client_id} = z.client.Client.dismantle_user_client_id(session_id);
          payload.recipients[user_id] = payload.recipients[user_id] || {};
          payload.recipients[user_id][client_id] = cipher_text;
        });
        return payload;
      });
  }

  /**
   * Handle an encrypted event.
   * @param {Object} event - Backend event to decrypt
   * @returns {Promise} Resolves with decrypted and mapped message
   */
  handle_encrypted_event(event) {
    const {data: event_data, from, id} = event;

    if (!event_data) {
      this.logger.error(`Encrypted event with ID '${id}' from user ''${from} does not contain it's data payload`, event);
      return Promise.reject(new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.NO_DATA_CONTENT));
    }

    // Check the length of the message
    if (typeof event_data.text === 'string' && (event_data.text.length > z.config.MAXIMUM_MESSAGE_LENGTH_RECEIVING)) {
      const decryption_error = new Proteus.errors.DecryptError.InvalidMessage('The received message was too big.', 300);
      return Promise.resolve(z.conversation.EventBuilder.build_incoming_message_too_big(event, decryption_error, decryption_error.code));
    }

    if (event_data.text === CryptographyRepository.REMOTE_ENCRYPTION_FAILURE) {
      const decryption_error = new Proteus.errors.DecryptError.InvalidMessage('The sending client couldn\'t encrypt a message for our client.');
      return Promise.resolve(this._handle_decryption_failure(decryption_error, event));
    }

    return this._decrypt_event(event)
      .then((generic_message) => this.cryptography_mapper.map_generic_message(generic_message, event))
      .catch((error) => this._handle_decryption_failure(error, event));
  }

  _session_from_encoded_prekey_payload(remote_pre_key, user_id, client_id) {
    return Promise.resolve()
      .then(() => {
        if (remote_pre_key) {
          this.logger.log(`Initializing session with Client ID '${client_id}' from User ID '${user_id}' with remote PreKey ID '${remote_pre_key.id}'.`);
          return this.cryptobox.session_from_prekey(this._construct_session_id(user_id, client_id), z.util.base64_to_array(remote_pre_key.key).buffer);
        }
        this.logger.warn(`No remote PreKey for User ID '${user_id}' with Client ID '${client_id}' found. The owner probably deleted the client already.`);
        return undefined;
      })
      .catch((error) => {
        this.logger.warn(`Invalid remote PreKey for User ID '${user_id}' with Client ID '${client_id}' found. Skipping encryption. Reason: ${error.message}`, error);
        return undefined;
      });
  }

  _encrypt_generic_message_for_new_sessions(recipients_for_missing_sessions, generic_message) {
    if (Object.keys(recipients_for_missing_sessions).length) {
      return this.get_users_pre_keys(recipients_for_missing_sessions)
        .then((user_pre_key_map) => {
          this.logger.info(`Fetched pre-keys for '${Object.keys(user_pre_key_map).length}' users.`, user_pre_key_map);

          const new_session_promises = [];

          for (const user_id in user_pre_key_map) {
            const client_pre_key_map = user_pre_key_map[user_id];
            for (const client_id in client_pre_key_map) {
              const remote_pre_key = client_pre_key_map[client_id];
              new_session_promises.push(this._session_from_encoded_prekey_payload(remote_pre_key, user_id, client_id));
            }
          }

          return Promise.all(new_session_promises);
        })
        .then((cryptobox_sessions) => {
          const cipher_payload_promises = [];

          cryptobox_sessions.forEach((cryptobox_session) => {
            if (cryptobox_session) {
              cipher_payload_promises.push(this._encrypt_payload_for_session(cryptobox_session.id, generic_message));
            }
          });

          return Promise.all(cipher_payload_promises);
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
  _construct_payload(sender) {
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
  _decrypt_event(event) {
    const {data: event_data, from} = event;
    const cipher_text = z.util.base64_to_array(event_data.text || event_data.key).buffer;
    const session_id = this._construct_session_id(from, event_data.sender);

    return this.cryptobox.decrypt(session_id, cipher_text)
      .then((plaintext) => z.proto.GenericMessage.decode(plaintext));
  }

  /**
   * Encrypt the generic message for a given session.
   * @note We created the convention that whenever we fail to encrypt for a specific client, we send a Bomb Emoji (no joke!)
   *
   * @private
   * @param {string} session_id - ID of session to encrypt for
   * @param {z.proto.GenericMessage} generic_message - ProtoBuffer message
   * @returns {Object} Contains session ID and encrypted message as BASE64 encoded string
   */
  _encrypt_payload_for_session(session_id, generic_message) {
    return this.cryptobox.encrypt(session_id, generic_message.toArrayBuffer())
      .then((cipher_text) => {
        return {cipher_text: z.util.array_to_base64(cipher_text), session_id: session_id};
      })
      .catch((error) => {
        if (error instanceof cryptobox.store.RecordNotFoundError) {
          this.logger.log(`Session '${session_id}' needs to get initialized...`);
          return {session_id: session_id};
        }
        this.logger.warn(`Failed encrypting '${generic_message.content}' message for session '${session_id}': ${error.message}`, error);
        return {cipher_text: CryptographyRepository.REMOTE_ENCRYPTION_FAILURE, session_id: session_id};
      });
  }

  _handle_decryption_failure(error, event) {
    // Get error information
    const error_code = error.code || CryptographyRepository.CONFIG.UNKNOWN_DECRYPTION_ERROR_CODE;

    const {data: event_data, from: remote_user_id} = event;
    const remote_client_id = event_data.sender;
    const session_id = this._construct_session_id(remote_user_id, remote_client_id);

    const is_duplicate_message = error instanceof Proteus.errors.DecryptError.DuplicateMessage;
    const is_outdated_message = error instanceof Proteus.errors.DecryptError.OutdatedMessage;
    if (is_duplicate_message || is_outdated_message) {
      // We don't need to show duplicate message errors to the user
      throw new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE);
    }

    const is_cryptography_error = error instanceof z.cryptography.CryptographyError;
    if (is_cryptography_error && error.type === z.cryptography.CryptographyError.TYPE.PREVIOUSLY_STORED) {
      throw new z.cryptography.CryptographyError(z.cryptography.CryptographyError.TYPE.UNHANDLED_TYPE);
    }

    const is_invalid_message = error instanceof Proteus.errors.DecryptError.InvalidMessage;
    const is_invalid_signature = error instanceof Proteus.errors.DecryptError.InvalidSignature;
    const is_remote_identity_changed = error instanceof Proteus.errors.DecryptError.RemoteIdentityChanged;
    if (is_invalid_message || is_invalid_signature) {
      // Session is broken, let's see what's really causing it...
      this.logger.error(`Session '${session_id}' with user '${remote_user_id}' (client '${remote_client_id}') is broken or out of sync. Reset the session and decryption is likely to work again. Error: ${error.message}`, error);
    } else if (is_remote_identity_changed) {
      // Remote identity changed
      this.logger.error(`Remote identity of client '${remote_client_id}' from user '${remote_user_id}' changed: ${error.message}`, error);
    }

    this.logger.warn(`Could not decrypt an event from client ID '${remote_client_id}' of user ID '${remote_user_id}' in session ID '${session_id}'.\nError Code: '${error_code}'\nError Message: ${error.message}`, error);
    this._report_decryption_failure(error, event);

    return z.conversation.EventBuilder.build_unable_to_decrypt(event, error, error_code);
  }

  /**
   * Report decryption error to Localytics and stack traces to Raygun.
   *
   * @private
   * @param {Error} error - Error from event decryption
   * @param {Object} event_data - Event data
   * @param {string} user_id - Remote user ID
   * @param {string} event_type - Event type
   * @returns {undefined} No return value
   */
  _report_decryption_failure(error, {data: event_data, from: user_id, type: event_type}) {
    const session_id = this._construct_session_id(user_id, event_data.sender);

    amplify.publish(z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.E2EE.CANNOT_DECRYPT_MESSAGE, {cause: error.code || error.message});

    const custom_data = {
      client_local_class: this.current_client().class,
      client_local_type: this.current_client().type,
      cryptobox_version: cryptobox.version,
      error_code: error.code,
      event_type: event_type,
      session_id: session_id,
    };

    const raygun_error = new Error(`Decryption failed: ${error.code || error.message}`);
    raygun_error.stack = error.stack;
    Raygun.send(raygun_error, custom_data);
  }
};
