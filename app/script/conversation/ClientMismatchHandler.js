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
window.z.conversation = z.conversation || {};

z.conversation.ClientMismatchHandler = class ClientMismatchHandler {
  constructor(conversationRepository, cryptographyRepository, userRepository) {
    this.conversationRepository = conversationRepository;
    this.cryptographyRepository = cryptographyRepository;
    this.userRepository = userRepository;

    this.logger = new z.util.Logger('z.conversation.ClientMismatchHandler', z.config.LOGGER.OPTIONS);
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
  onClientMismatch(clientMismatch, conversationId, genericMessage, payload) {
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

    const _removeDeletedUser = userId => {
      if (payload && !Object.keys(payload.recipients[userId]).length) {
        delete payload.recipients[userId];
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
      .then(conversationEntity => {
        const _removeRedundantClient = (userId, clientId) => {
          if (payload) {
            delete payload.recipients[userId][clientId];
          }
        };

        const _removeRedundantUser = userId => {
          if (conversationEntity && conversationEntity.is_group()) {
            conversationEntity.participating_user_ids.remove(userId);
          }

          if (payload && !Object.keys(payload.recipients[userId]).length) {
            return delete payload.recipients[userId];
          }
        };

        return Promise.all(this._mapRecipients(recipients, _removeRedundantClient, _removeRedundantUser)).then(() => {
          if (conversationEntity) {
            this.conversationRepository.update_participating_user_ets(conversationEntity);
          }

          return payload;
        });
      });
  }

  /**
   * Map a function to recipients.
   *
   * @private
   * @param {Object} recipients - User client map
   * @param {Function} clientFn - Function to be executed on clients first
   * @param {Function} [userFn] - Function to be executed on users at the end
   * @returns {Array} Function array
   */
  _mapRecipients(recipients, clientFn, userFn) {
    const result = [];
    const userIds = Object.keys(recipients);

    userIds.forEach(userId => {
      if (recipients.hasOwnProperty(userId)) {
        const clientIds = recipients[userId] || [];

        if (_.isFunction(clientFn)) {
          clientIds.forEach(clientId => result.push(clientFn(userId, clientId)));
        }

        if (_.isFunction(userFn)) {
          result.push(userFn(userId));
        }
      }
    });

    return result;
  }
};
