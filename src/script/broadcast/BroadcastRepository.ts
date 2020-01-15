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

import {GenericMessage} from '@wireapp/protocol-messaging';
import {amplify} from 'amplify';

import {Logger, getLogger} from 'Util/Logger';

import {ClientRepository} from '../client/ClientRepository';
import {ClientMismatchHandler} from '../conversation/ClientMismatchHandler';
import {ConversationRepository} from '../conversation/ConversationRepository';
import {EventInfoEntity} from '../conversation/EventInfoEntity';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {User} from '../entity/User';
import {BackendClientError} from '../error/BackendClientError';
import {WebAppEvents} from '../event/WebApp';
import {MessageSender} from '../message/MessageSender';
import {BroadcastService} from './BroadcastService';

export class BroadcastRepository {
  private readonly broadcastService: BroadcastService;
  private readonly clientMismatchHandler: ClientMismatchHandler;
  private readonly clientRepository: ClientRepository;
  private readonly conversationRepository: ConversationRepository;
  private readonly cryptographyRepository: CryptographyRepository;
  private readonly logger: Logger;
  private readonly messageSender: MessageSender;

  /**
   * @param broadcastService Backend REST API broadcast service implementation
   * @param clientRepository Repository for client interactions
   * @param conversationRepository Repository for conversation interactions
   * @param cryptographyRepository Repository for all cryptography interactions
   * @param messageSender Responsible for queueing and sending messages
   */
  constructor(
    broadcastService: BroadcastService,
    clientRepository: ClientRepository,
    conversationRepository: ConversationRepository,
    cryptographyRepository: CryptographyRepository,
    messageSender: MessageSender,
  ) {
    this.broadcastService = broadcastService;
    this.clientRepository = clientRepository;
    this.conversationRepository = conversationRepository;
    this.cryptographyRepository = cryptographyRepository;
    this.messageSender = messageSender;
    this.logger = getLogger('BroadcastRepository');

    this.clientMismatchHandler = this.conversationRepository.clientMismatchHandler;

    /*
     * FIXME this should not be handled by an event. This an action we want to perform, thus should be a direct method call.
     * To do that, we need to inject the BroadcastRepository into the UserRepository.
     * But this will create a cyclic dependency that we need to resolve first.
     * As of now, the cyclic dependency would go like this:
     *   - ConversationRepo needs UserRepository
     *   - UserRepostory needs BroadcastRepository
     *   - BroadcastRepository needs ConversationRepository
     *
     * Needing the ConversationRepository in the BroadcastRepository doesn't make sense. We need to get rid of that dependency
     * The heavy lifting resides in generalizing the `clientMismatchHandler` so that it doesn't need to directly call the ConversationRepo
     */
    amplify.subscribe(
      WebAppEvents.BROADCAST.SEND_MESSAGE,
      ({genericMessage, recipients}: {genericMessage: GenericMessage; recipients: User[]}) => {
        this.broadcastGenericMessage(genericMessage, recipients);
      },
    );
  }

  /**
   * @param genericMessage Generic message that will be send
   * @param userEntities Recipients of the message
   * @returns resolves when the message is sent
   */
  broadcastGenericMessage(genericMessage: GenericMessage, userEntities: User[]): Promise<any> {
    return this.messageSender.queueMessage(() => {
      const recipients = this.createBroadcastRecipients(userEntities);
      return this.cryptographyRepository.encryptGenericMessage(recipients, genericMessage).then(payload => {
        const eventInfoEntity = new EventInfoEntity(genericMessage);
        this._sendEncryptedMessage(eventInfoEntity, payload);
      });
    });
  }

  /**
   * Create a user client map for a broadcast message.
   * @param userEntities Recipients of the message
   * @returns Resolves with a user client map
   */
  private createBroadcastRecipients(userEntities: User[]): Record<string, string[]> {
    return userEntities.reduce((recipientsIndex: Record<string, string[]>, userEntity) => {
      recipientsIndex[userEntity.id] = userEntity.devices().map(clientEntity => clientEntity.id);
      return recipientsIndex;
    }, {});
  }

  /**
   * Broadcasts an OTR message / event.
   *
   * @param eventInfoEntity Event to be broadcasted
   * @returns Promise that resolves after sending the encrypted message
   */
  private _sendEncryptedMessage(eventInfoEntity: EventInfoEntity, payload: any): Promise<any> {
    const messageType = eventInfoEntity.getType();
    this.logger.info(`Sending '${messageType}' message as broadcast`, payload);

    const options = eventInfoEntity.options;
    return this.broadcastService
      .postBroadcastMessage(payload, options.precondition)
      .then(response => {
        this.clientMismatchHandler.onClientMismatch(eventInfoEntity, response, payload);
        return response;
      })
      .catch(axiosError => {
        const error = axiosError.response?.data || axiosError;
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
