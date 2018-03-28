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
   * @param {z.proto.GenericMessage} genericMessage - GenericMessage that was sent
   * @param {Object} payload - Initial payload resulting in a 412
   * @param {string} conversationId - ID of conversation message was sent int
   * @returns {Promise} Resolve when mismatch was handled
   */
  onClientMismatch(clientMismatch, genericMessage, payload, conversationId) {
    const {deleted: deletedClients, missing: missingClients, redundant: redundantClients} = clientMismatch;

    return Promise.resolve()
      .then(() => this._handleClientMismatchRedundant(redundantClients, payload, conversationId))
      .then(updatedPayload => this._handleClientMismatchDeleted(deletedClients, updatedPayload))
      .then(updatedPayload => this._handleClientMismatchMissing(missingClients, updatedPayload, genericMessage));
  }

  /**
   * Handle the deleted client mismatch.
   *
   * @note Contains clients of which the backend is sure that they should not be recipient of a message and verified they no longer exist.
   * @private
   *
   * @param {Object} recipients - User client map containing redundant clients
   * @param {Object} payload - Payload of the request
   * @returns {Promise} Resolves with the updated payload
   */
  _handleClientMismatchDeleted(recipients, payload) {
    if (_.isEmpty(recipients)) {
      return Promise.resolve(payload);
    }
    this.logger.debug(`Message contains deleted clients of '${Object.keys(recipients).length}' users`, recipients);

    const _removeDeletedClient = (userId, clientId) => {
      delete payload.recipients[userId][clientId];
      return this.userRepository.remove_client_from_user(userId, clientId);
    };

    const _removeDeletedUser = userId => {
      const clientIdsOfUser = Object.keys(payload.recipients[userId]);
      const noRemainingClients = !clientIdsOfUser.length;

      if (noRemainingClients) {
        delete payload.recipients[userId];
      }
    };

    return Promise.all(this._mapRecipients(recipients, _removeDeletedClient, _removeDeletedUser)).then(() => {
      this.conversationRepository.verification_state_handler.onClientRemoved();
      return payload;
    });
  }

  /**
   * Handle the missing client mismatch.
   *
   * @private
   * @param {Object} recipients - User client map containing redundant clients
   * @param {Object} payload - Payload of the request
   * @param {z.proto.GenericMessage} genericMessage - Protobuffer message to be sent
   * @returns {Promise} Resolves with the updated payload
   */
  _handleClientMismatchMissing(recipients, payload, genericMessage) {
    if (_.isEmpty(recipients)) {
      return Promise.resolve(payload);
    }

    this.logger.debug(`Message is missing clients of '${Object.keys(recipients).length}' users`, recipients);

    return this.cryptographyRepository
      .encryptGenericMessage(recipients, genericMessage, payload)
      .then(updatedPayload => {
        payload = updatedPayload;

        const _addMissingClient = (userId, clientId) => this.userRepository.addClientToUser(userId, {id: clientId});
        return Promise.all(this._mapRecipients(recipients, _addMissingClient));
      })
      .then(() => {
        this.conversationRepository.verification_state_handler.onClientAdd(Object.keys(recipients));
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
   * @param {Object} payload - Payload of the request
   * @param {string} [conversationId] - ID of conversation the message was sent in
   * @returns {Promise} Resolves with the updated payload
   */
  _handleClientMismatchRedundant(recipients, payload, conversationId) {
    if (_.isEmpty(recipients)) {
      return Promise.resolve(payload);
    }
    this.logger.debug(`Message contains redundant clients of '${Object.keys(recipients).length}' users`, recipients);

    const conversationPromise = conversationId
      ? this.conversationRepository.get_conversation_by_id(conversationId).catch(error => {
          const isConversationNotFound = error.type === z.conversation.ConversationError.TYPE.CONVERSATION_NOT_FOUND;
          if (!isConversationNotFound) {
            throw error;
          }
        })
      : Promise.resolve();

    return conversationPromise.then(conversationEntity => {
      const _removeRedundantClient = (userId, clientId) => delete payload.recipients[userId][clientId];

      const _removeRedundantUser = userId => {
        const clientIdsOfUser = Object.keys(payload.recipients[userId]);
        const noRemainingClients = !clientIdsOfUser.length;

        if (noRemainingClients) {
          const isGroupConversation = conversationEntity && conversationEntity.is_group();
          if (isGroupConversation) {
            const timeOffset = this.conversationRepository.timeOffset;
            const event = z.conversation.EventBuilder.buildMemberLeave(conversationEntity, userId, false, timeOffset);

            amplify.publish(z.event.WebApp.EVENT.INJECT, event);
          }

          delete payload.recipients[userId];
        }
      };

      return Promise.all(this._mapRecipients(recipients, _removeRedundantClient, _removeRedundantUser)).then(() => {
        if (conversationEntity) {
          this.conversationRepository.updateParticipatingUserEntities(conversationEntity);
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
