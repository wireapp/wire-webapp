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

import {getLogger} from 'Util/Logger';
import {getDifference} from 'Util/ArrayUtil';
import {EventBuilder} from './EventBuilder';

export class ClientMismatchHandler {
  constructor(conversationRepository, cryptographyRepository, eventRepository, serverTimeHandler, userRepository) {
    this.conversationRepository = conversationRepository;
    this.cryptographyRepository = cryptographyRepository;
    this.eventRepository = eventRepository;
    this.serverTimeHandler = serverTimeHandler;
    this.userRepository = userRepository;

    this.logger = getLogger('ClientMismatchHandler');
  }

  /**
   * Handle client mismatch response from backend.
   *
   * @note As part of 412 or general response when sending encrypted message
   * @param {EventInfoEntity} eventInfoEntity Info about message
   * @param {ClientMismatch} clientMismatch Client mismatch object containing client user maps for deleted, missing and obsolete clients
   * @param {NewOTRMessage} payload Initial payload resulting in a 412
   * @returns {Promise<NewOTRMessage>} Resolve when mismatch was handled
   */
  async onClientMismatch(eventInfoEntity, clientMismatch, payload) {
    const {deleted, missing, redundant} = clientMismatch;
    const conversationEntity = await this.conversationRepository.get_conversation_by_id(eventInfoEntity.conversationId);
    this._handleRedundant(redundant, payload, conversationEntity);
    this._handleDeleted(deleted, payload, conversationEntity);
    await this._handleMissing(missing, payload, conversationEntity, eventInfoEntity);
    return payload;
  }

  /**
   * Handle the deleted client mismatch.
   *
   * @note Contains clients of which the backend is sure that they should not be recipient of a message and verified they no longer exist.
   * @private
   *
   * @param {UserClients} recipients User client map containing redundant clients
   * @param {NewOTRMessage} payload Payload of the request
   * @param {Conversation} conversationEntity Conversation entity
   * @returns {NewOTRMessage} Resolves with the updated payload
   */
  async _handleDeleted(recipients, payload, conversationEntity) {
    if (Object.entries(recipients).length === 0) {
      return payload;
    }
    this.logger.debug(`Message contains deleted clients of '${Object.keys(recipients).length}' users`, recipients);

    const removeDeletedClient = (userId, clientId) => {
      delete payload.recipients[userId][clientId];
      this.userRepository.remove_client_from_user(userId, clientId);
    };

    const removeDeletedUser = userId => {
      const clientIdsOfUser = Object.keys(payload.recipients[userId]);
      const noRemainingClients = !clientIdsOfUser.length;

      if (noRemainingClients) {
        const isGroupConversation = conversationEntity.isGroup();
        if (isGroupConversation) {
          const timestamp = this.serverTimeHandler.toServerTimestamp();
          const event = EventBuilder.buildMemberLeave(conversationEntity, userId, false, timestamp);
          this.eventRepository.injectEvent(event);
        }

        delete payload.recipients[userId];
      }
    };

    this._remove(recipients, removeDeletedClient, removeDeletedUser);
    return payload;
  }

  /**
   * Handle the missing client mismatch.
   *
   * @private
   * @param {UserClients} recipients User client map containing redundant clients
   * @param {NewOTRMessage} payload Payload of the request
   * @param {Conversation} conversationEntity Conversation entity
   * @param {EventInfoEntity} eventInfoEntity Info about event
   * @returns {Promise<NewOTRMessage>} Resolves with the updated payload
   */
  async _handleMissing(recipients, payload, conversationEntity, eventInfoEntity) {
    const missingUserIds = Object.keys(recipients);

    if (!missingUserIds.length) {
      return Promise.resolve(payload);
    }

    this.logger.debug(`Message is missing clients of '${missingUserIds.length}' users`, recipients);

    const {conversationId, genericMessage, timestamp} = eventInfoEntity;
    const knownUserIds = conversationEntity.participating_user_ids();
    const unknownUserIds = getDifference(knownUserIds, missingUserIds);

    if (unknownUserIds.length > 0) {
      await this.conversationRepository.addMissingMember(conversationId, unknownUserIds, timestamp - 1);
    }

    const newPayload = await this.cryptographyRepository.encryptGenericMessage(recipients, genericMessage, payload);
    payload = newPayload;

    await Promise.all(
      missingUserIds.map(userId => {
        return this.userRepository.getClientsByUserId(userId, false).then(clients => {
          return Promise.all(clients.map(client => this.userRepository.addClientToUser(userId, client)));
        });
      }),
    );

    this.conversationRepository.verificationStateHandler.onClientsAdded(missingUserIds);

    return payload;
  }

  /**
   * Handle the redundant client mismatch.

   * @note Contains clients of which the backend is sure that they should not be recipient of a message but cannot say whether they exist.
   *   Normally only contains clients of users no longer participating in a conversation.
   *   Sometimes clients of the self user are listed. Thus we cannot remove the payload for all the clients of a user without checking.
   * @private
   *
   * @param {UserClients} recipients User client map containing redundant clients
   * @param {NewOTRMessage} payload Payload of the request
   * @param {Conversation} conversationEntity Conversation entity
   * @returns {Promise<NewOTRMessage>} Resolves with the updated payload
   */
  _handleRedundant(recipients, payload, conversationEntity) {
    if (Object.entries(recipients).length === 0) {
      return Promise.resolve(payload);
    }

    this.logger.debug(`Message contains redundant clients of '${Object.keys(recipients).length}' users`, recipients);

    const removeRedundantClient = (userId, clientId) => delete payload.recipients[userId][clientId];

    const removeRedundantUser = userId => {
      const clientIdsOfUser = Object.keys(payload.recipients[userId]);
      const noRemainingClients = !clientIdsOfUser.length;

      if (noRemainingClients) {
        const isGroupConversation = conversationEntity.isGroup();
        if (isGroupConversation) {
          const timestamp = this.serverTimeHandler.toServerTimestamp();
          const event = EventBuilder.buildMemberLeave(conversationEntity, userId, false, timestamp);
          this.eventRepository.injectEvent(event);
        }

        delete payload.recipients[userId];
      }
    };

    this._remove(recipients, removeRedundantClient, removeRedundantUser);

    this.conversationRepository.updateParticipatingUserEntities(conversationEntity);

    return payload;
  }

  /**
   * Starts removal functions.
   *
   * @private
   * @param {UserClients} recipients User client map
   * @param {Function} clientFn Function to remove clients
   * @param {Function} userFn Function to remove users
   * @returns {Array} Function array
   */
  _remove(recipients, clientFn, userFn) {
    const result = [];

    Object.entries(recipients).forEach(([userId, clientIds = []]) => {
      clientIds.forEach(clientId => result.push(clientFn(userId, clientId)));
      result.push(userFn(userId));
    });

    return result;
  }
}
