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

import {EventInfoEntity} from '../conversation/EventInfoEntity';
import {WebAppEvents} from '../event/WebApp';

import {BackendClientError} from '../error/';

// Broadcast repository for all broadcast interactions with the broadcast service
class BroadcastRepository {
  /**
   * Construct a new Broadcast Repository.
   *
   * @param {BroadcastService} broadcastService - Backend REST API broadcast service implementation
   * @param {ClientRepository} clientRepository - Repository for client interactions
   * @param {ConversationRepository} conversationRepository - Repository for conversation interactions
   * @param {CryptographyRepository} cryptographyRepository - Repository for all cryptography interactions
   * @param {MessageSender} messageSender - Responsible for queueing and sending messages
   */
  constructor(broadcastService, clientRepository, conversationRepository, cryptographyRepository, messageSender) {
    this.broadcastService = broadcastService;
    this.clientRepository = clientRepository;
    this.conversationRepository = conversationRepository;
    this.cryptographyRepository = cryptographyRepository;
    this.messageSender = messageSender;
    this.logger = getLogger('BroadcastRepository');

    this.clientMismatchHandler = this.conversationRepository.clientMismatchHandler;

    /*
    FIXME this should not be handled by an event. This an action we want to perform, thus should be a direct method call.
    To do that, we need to inject the BroadcastRepository into the UserRepository.
    But this will create a cyclic dependency that we need to resolve first.
    As of now, the cyclic dependency would go like this:
      - ConversationRepo needs UserRepository
      - UserRepostory needs BroadcastRepository
      - BroadcastRepository needs ConversationRepository

    Needing the ConversationRepository in the BroadcastRepository doesn't make sense. We need to get rid of that dependency
    The heavy lifting resides in generalizing the `clientMismatchHandler` so that it doesn't need to directly call the ConversationRepo
    */
    amplify.subscribe(WebAppEvents.BROADCAST.SEND_MESSAGE, ({genericMessage, recipients}) => {
      this.broadcastGenericMessage(genericMessage, recipients);
    });
  }

  /**
   * @param {GenericMessage} genericMessage - Generic message that will be send
   * @param {Array<User>} userEntities - Recipients of the message
   * @returns {Promise} - resolves when the message is sent
   */
  broadcastGenericMessage(genericMessage, userEntities) {
    return this.messageSender.queueMessage(() => {
      const recipients = this._createBroadcastRecipients(userEntities);
      return this.cryptographyRepository.encryptGenericMessage(recipients, genericMessage).then(payload => {
        const eventInfoEntity = new EventInfoEntity(genericMessage);
        this._sendEncryptedMessage(eventInfoEntity, payload);
      });
    });
  }

  /**
   * Create a user client map for a broadcast message.
   * @private
   * @param {Array<User>} userEntities - Recipients of the message
   * @returns {Promise} Resolves with a user client map
   */
  _createBroadcastRecipients(userEntities) {
    return userEntities.reduce((recipientsIndex, userEntity) => {
      return Object.assign({}, recipientsIndex, {
        [userEntity.id]: userEntity.devices().map(clientEntity => clientEntity.id),
      });
    }, {});
  }

  /**
   * Broadcasts an otr message.
   *
   * @private
   * @note Options for the precondition check on missing clients are:
   *   'false' - all clients, 'Array<String>' - only clients of listed users, 'true' - force sending
   *
   * @param {EventInfoEntity} eventInfoEntity - Event to be broadcasted
   * @param {Object} payload - Payload
   * @returns {Promise} Promise that resolves after sending the encrypted message
   */
  _sendEncryptedMessage(eventInfoEntity, payload) {
    const messageType = eventInfoEntity.getType();
    this.logger.info(`Sending '${messageType}' message as broadcast`, payload);

    const options = eventInfoEntity.options;
    return this.broadcastService
      .postBroadcastMessage(payload, options.precondition)
      .then(response => {
        this.clientMismatchHandler.onClientMismatch(eventInfoEntity, response, payload);
        return response;
      })
      .catch(error => {
        const isUnknownClient = error.label === BackendClientError.LABEL.UNKNOWN_CLIENT;
        if (isUnknownClient) {
          this.clientRepository.removeLocalClient();
        }

        if (!error.missing) {
          throw error;
        }

        return this.clientMismatchHandler.onClientMismatch(eventInfoEntity, error, payload).then(updatedPayload => {
          this.logger.info(`Updated '${messageType}' message as broadcast`, updatedPayload);
          eventInfoEntity.forceSending();
          return this._sendEncryptedMessage(eventInfoEntity, updatedPayload);
        });
      });
  }
}

export {BroadcastRepository};
