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
window.z.broadcast = z.broadcast || {};

// Broadcast repository for all broadcast interactions with the broadcast service
z.broadcast.BroadcastRepository = class BroadcastRepository {
  /**
   * Construct a new Conversation Repository.
   *
   * @param {BroadcastService} broadcastService - Backend REST API broadcast service implementation
   * @param {ClientRepository} clientRepository - Repository for client interactions
   * @param {ConversationRepository} conversationRepository - Repository for conversation interactions
   * @param {CryptographyRepository} cryptographyRepository - Repository for all cryptography interactions
   * @param {UserRepository} userRepository - Repository for all user and connection interactions
   */
  constructor(broadcastService, clientRepository, conversationRepository, cryptographyRepository, userRepository) {
    this.broadcastService = broadcastService;
    this.clientRepository = clientRepository;
    this.conversationRepository = conversationRepository;
    this.cryptographyRepository = cryptographyRepository;
    this.userRepository = userRepository;
    this.logger = new z.util.Logger('z.broadcast.BroadcastRepository', z.config.LOGGER.OPTIONS);

    amplify.subscribe(z.event.WebApp.BROADCAST.SEND_MESSAGE, this.sendMessage.bind(this));
  }

  sendMessage(genericMessage) {
    return this.broadcastGenericMessage(genericMessage);
  }

  /**
   * Map a function to recipients.
   *
   * @private
   * @param {Object} recipients - User client map
   * @param {Function} client_fn - Function to be executed on clients first
   * @param {Function} [user_fn] - Function to be executed on users at the end
   * @returns {Array} Function array
   */
  _mapRecipients(recipients, client_fn, user_fn) {
    const result = [];
    const user_ids = Object.keys(recipients);

    user_ids.forEach(user_id => {
      if (recipients.hasOwnProperty(user_id)) {
        const client_ids = recipients[user_id];

        if (_.isFunction(client_fn)) {
          client_ids.forEach(client_id => result.push(client_fn(user_id, client_id)));
        }

        if (_.isFunction(user_fn)) {
          result.push(user_fn(user_id));
        }
      }
    });

    return result;
  }

  /**
   * Create a user client map for a broadcast message.
   * @returns {Promise} Resolves with a user client map
   */
  createBroadcastRecipients() {
    return Promise.resolve().then(() => {
      const recipients = {};

      for (const user_et of this.userRepository.team_users()) {
        recipients[user_et.id] = user_et.devices().map(client_et => client_et.id);
      }

      return recipients;
    });
  }

  broadcastGenericMessage(genericMessage) {
    return this.conversationRepository.sending_queue.push(() => {
      return this.createBroadcastRecipients()
        .then(recipients => this.cryptographyRepository.encrypt_generic_message(recipients, genericMessage))
        .then(payload => this._sendEncryptedMessage(genericMessage, payload));
    });
  }

  /**
   * Broadcasts an otr message.
   *
   * @private
   * @note Options for the precondition check on missing clients are:
   *   'false' - all clients, 'Array<String>' - only clients of listed users, 'true' - force sending
   *
   * @param {z.proto.GenericMessage} genericMessage - Protobuf message to be encrypted and send
   * @param {Object} payload - Payload
   * @param {Array<string>|boolean} preconditionOption - Level that backend checks for missing clients
   * @returns {Promise} Promise that resolves after sending the encrypted message
   */
  _sendEncryptedMessage(genericMessage, payload, preconditionOption = false) {
    const messageType = genericMessage.content;
    this.logger.info(`Sending '${messageType}' message as broadcast`, payload);

    return this.broadcastService
      .postBroadcastMessage(payload, preconditionOption)
      .then(response => {
        this._handleClientMismatch(response, undefined);
        return response;
      })
      .catch(error => {
        const isUnknownClient = error.label === z.service.BackendClientError.LABEL.UNKNOWN_CLIENT;
        if (isUnknownClient) {
          this.clientRepository.remove_local_client();
        }

        if (!error.missing) {
          throw error;
        }

        return this._handleClientMismatch(error, undefined, genericMessage, payload).then(updatedPayload => {
          this.logger.info(`Updated '${messageType}' message as broadcast`, updatedPayload);
          return this._sendEncryptedMessage(genericMessage, updatedPayload, true);
        });
      });
  }

  /**
   * Estimate whether message should be send as type external.
   *
   * @private
   * @param {string} conversationId - Conversation ID
   * @param {z.proto.GenericMessage} genericMessage - Generic message that will be send
   * @returns {boolean} Is payload likely to be too big so that we switch to type external?
   */
  _shouldSendAsExternal(conversationId, genericMessage) {
    return this.conversationRepository.get_conversation_by_id(conversationId).then(conversation_et => {
      const estimatedNumberOfClients = conversation_et.get_number_of_participants() * 4;
      const messageInBytes = new Uint8Array(genericMessage.toArrayBuffer()).length;
      const estimatedPayloadInBytes = estimatedNumberOfClients * messageInBytes;

      return estimatedPayloadInBytes > ConversationRepository.CONFIG.EXTERNAL_MESSAGE_THRESHOLD;
    });
  }

  /**
   * Handle client mismatch response from backend.
   *
   * @note As part of 412 or general response when sending encrypted message
   * @param {Object} clientMismatch - Client mismatch object containing client user maps for deleted, missing and obsolete clients
   * @param {string} conversationId - ID of conversation message was sent int
   * @param {z.proto.GenericMessage} [genericMessage] - GenericMessage that was sent
   * @param {Object} [payload] - Initial payload resulting in a 412
   * @returns {Promise} Resolve when mismatch was handled
   */
  _handleClientMismatch(clientMismatch, conversationId, genericMessage, payload) {
    const {deleted: deletedClients, missing: missingClients, redundant: redundantClients} = clientMismatch;

    return Promise.resolve()
      .then(() => {
        return this._handleClientMismatchRedundant(redundantClients, payload, conversationId);
      })
      .then(updatedPayload => {
        return this._handleClientMismatchDeleted(deletedClients, updatedPayload);
      })
      .then(updatedPayload => {
        return this._handleClientMismatchMissing(missingClients, updatedPayload, genericMessage);
      });
  }

  /**
   * Handle the deleted client mismatch.
   *
   * @note Contains clients of which the backend is sure that they should not be recipient of a message and verified they no longer exist.
   * @private
   *
   * @param {Object} recipients - User client map containing redundant clients
   * @param {Object} payload - Optional payload of the failed request
   * @returns {Promise} Resolves with the updated payload
   */
  _handleClientMismatchDeleted(recipients, payload) {
    if (_.isEmpty(recipients)) {
      return Promise.resolve(payload);
    }
    this.logger.debug(`Message contains deleted clients of '${Object.keys(recipients).length}' users`, recipients);

    const _removeDeletedClient = (userId, clientId) => {
      if (payload) {
        delete payload.recipients[userId][clientId];
      }
      return this.userRepository.remove_client_from_user(userId, clientId);
    };

    const _removeDeletedUser = user_id => {
      if (payload && !Object.keys(payload.recipients[user_id]).length) {
        delete payload.recipients[user_id];
      }
    };

    return Promise.all(this._mapRecipients(recipients, _removeDeletedClient, _removeDeletedUser)).then(() => {
      this.conversationRepository.verification_state_handler.on_client_removed(Object.keys(recipients));
      return payload;
    });
  }

  /**
   * Handle the missing client mismatch.
   *
   * @private
   * @param {Object} recipients - User client map containing redundant clients
   * @param {Object} payload - Optional payload of the failed request
   * @param {z.proto.GenericMessage} genericMessage - Protobuffer message to be sent
   * @returns {Promise} Resolves with the updated payload
   */
  _handleClientMismatchMissing(recipients, payload, genericMessage) {
    if (!payload || _.isEmpty(recipients)) {
      return Promise.resolve(payload);
    }
    this.logger.debug(`Message is missing clients of '${Object.keys(recipients).length}' users`, recipients);

    return this.cryptographyRepository
      .encrypt_generic_message(recipients, genericMessage, payload)
      .then(updatedPayload => {
        payload = updatedPayload;

        const _addMissingClient = (userId, clientId) => {
          return this.userRepository.add_client_to_user(userId, new z.client.Client({id: clientId}));
        };

        return Promise.all(this._mapRecipients(recipients, _addMissingClient));
      })
      .then(() => {
        this.conversationRepository.verification_state_handler.on_client_add(Object.keys(recipients));
        return payload;
      });
  }

  /**
   * Handle the redundant client mismatch.

   * @note Contains clients of which the backend is sure that they should not be recipient of a message but cannot say whether they exist.
   *   Normally only contains clients of users no longer participating in a conversation.
   *   Sometimes clients of the self user are listed. Thus we cannot remove the payload for all the clients of a user without checking.
   * @private
   *
   * @param {Object} recipients - User client map containing redundant clients
   * @param {Object} payload - Optional payload of the failed request
   * @param {string} conversationId - ID of conversation the message was sent in
   * @returns {Promise} Resolves with the updated payload
  */
  _handleClientMismatchRedundant(recipients, payload, conversationId) {
    if (_.isEmpty(recipients)) {
      return Promise.resolve(payload);
    }
    this.logger.debug(`Message contains redundant clients of '${Object.keys(recipients).length}' users`, recipients);

    return this.conversationRepository
      .get_conversation_by_id(conversationId)
      .catch(error => {
        if (error.type !== z.conversation.ConversationError.TYPE.NOT_FOUND) {
          throw error;
        }
      })
      .then(conversationEt => {
        const _removeRedundantClient = (userId, clientId) => {
          if (payload) {
            delete payload.recipients[userId][clientId];
          }
        };

        const _removeRedundantUser = userId => {
          if (conversationEt && conversationEt.is_group()) {
            conversationEt.participating_user_ids.remove(userId);
          }

          if (payload && !Object.keys(payload.recipients[userId]).length) {
            return delete payload.recipients[userId];
          }
        };

        return Promise.all(this._mapRecipients(recipients, _removeRedundantClient, _removeRedundantUser)).then(() => {
          if (conversationEt) {
            this.conversationRepository.update_particpating_user_ets(conversationEt);
          }

          return payload;
        });
      });
  }
};
