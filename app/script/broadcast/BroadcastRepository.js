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
   * Construct a new Broadcast Repository.
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

    this.clientMismatchHandler = this.conversationRepository.clientMismatchHandler;

    amplify.subscribe(z.event.WebApp.BROADCAST.SEND_MESSAGE, this.broadcastGenericMessage.bind(this));
  }

  broadcastGenericMessage(genericMessage) {
    return this.conversationRepository.sending_queue.push(() => {
      return this._createBroadcastRecipients()
        .then(recipients => this.cryptographyRepository.encrypt_generic_message(recipients, genericMessage))
        .then(payload => this._sendEncryptedMessage(genericMessage, payload));
    });
  }

  /**
   * Create a user client map for a broadcast message.
   * @private
   * @returns {Promise} Resolves with a user client map
   */
  _createBroadcastRecipients() {
    return Promise.resolve().then(() => {
      const recipients = {};

      for (const userEntity of this.userRepository.team_users().concat(this.userRepository.self())) {
        recipients[userEntity.id] = userEntity.devices().map(clientEntity => clientEntity.id);
      }

      return recipients;
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
        this.clientMismatchHandler.onClientMismatch(response, undefined);
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

        return this.clientMismatchHandler
          .onClientMismatch(error, undefined, genericMessage, payload)
          .then(updatedPayload => {
            this.logger.info(`Updated '${messageType}' message as broadcast`, updatedPayload);
            return this._sendEncryptedMessage(genericMessage, updatedPayload, true);
          });
      });
  }

  _getNumberOfClients() {
    return this.userRepository.team_users().reduce((accumulator, userEntity) => {
      if (userEntity.devices().length) {
        return accumulator + userEntity.devices().length;
      }
      return accumulator + z.client.ClientRepository.CONFIG.AVERAGE_NUMBER_OF_CLIENTS;
    }, this.userRepository.self().devices().length);
  }

  /**
   * Estimate whether message should be send as type external.
   *
   * @private
   * @param {z.proto.GenericMessage} genericMessage - Generic message that will be send
   * @returns {boolean} Is payload likely to be too big so that we switch to type external?
   */
  _shouldSendAsExternal(genericMessage) {
    const messageInBytes = new Uint8Array(genericMessage.toArrayBuffer()).length;
    const estimatedPayloadInBytes = this._getNumberOfClients() * messageInBytes;

    return estimatedPayloadInBytes > z.conversation.ConversationRepository.CONFIG.EXTERNAL_MESSAGE_THRESHOLD;
  }
};
