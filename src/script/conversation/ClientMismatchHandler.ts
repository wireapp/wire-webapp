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

import {getLogger, Logger} from 'Util/Logger';
import {getDifference} from 'Util/ArrayUtil';
import {ClientMismatch, UserClients} from '@wireapp/api-client/dist/conversation';
import {EventBuilder} from './EventBuilder';
import {ConversationRepository} from './ConversationRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {EventRepository} from '../event/EventRepository';
import {ServerTimeHandler} from '../time/serverTimeHandler';
import {UserRepository} from '../user/UserRepository';
import {EventInfoEntity} from './EventInfoEntity';
import {NewOTRMessage} from '@wireapp/api-client/dist/conversation';
import {Conversation} from '../entity/Conversation';
import {amplify} from 'amplify';
import {WebAppEvents} from '../event/WebApp';

export class ClientMismatchHandler {
  private readonly conversationRepository: ConversationRepository;
  private readonly cryptographyRepository: CryptographyRepository;
  private readonly eventRepository: EventRepository;
  private readonly serverTimeHandler: ServerTimeHandler;
  private readonly userRepository: UserRepository;
  private readonly logger: Logger;

  constructor(
    conversationRepository: ConversationRepository,
    cryptographyRepository: CryptographyRepository,
    eventRepository: EventRepository,
    serverTimeHandler: ServerTimeHandler,
    userRepository: UserRepository,
  ) {
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
   * @param eventInfoEntity Info about message
   * @param clientMismatch Client mismatch object containing client user maps for deleted, missing and obsolete clients
   * @param payload Initial payload resulting in a 412
   * @returns Resolves when mismatch was handled with updated OTR message
   */
  async onClientMismatch(
    eventInfoEntity: EventInfoEntity,
    clientMismatch: ClientMismatch,
    payload: NewOTRMessage,
  ): Promise<NewOTRMessage> {
    const {deleted, missing, redundant} = clientMismatch;
    // Note: Broadcast messages have an empty conversation ID
    const conversationEntity: Conversation | undefined =
      eventInfoEntity.conversationId !== ''
        ? await this.conversationRepository.get_conversation_by_id(eventInfoEntity.conversationId)
        : undefined;
    await this.handleRedundant(redundant, payload, conversationEntity);
    await this.handleDeleted(deleted, payload, conversationEntity);
    return this.handleMissing(missing, payload, conversationEntity, eventInfoEntity);
  }

  /**
   * Handle the deleted client mismatch.
   *
   * @note Contains clients of which the backend is sure that they should not be recipient of a message and verified they no longer exist.
   * @param recipients User client map containing redundant clients
   * @param payload Payload of the request
   * @param conversationEntity Conversation entity
   * @returns Resolves when the payload got updated
   */
  private async handleDeleted(
    recipients: UserClients,
    payload: NewOTRMessage,
    conversationEntity?: Conversation,
  ): Promise<void> {
    if (Object.entries(recipients).length === 0) {
      return;
    }
    this.logger.debug(`Message contains deleted clients of '${Object.keys(recipients).length}' users`, recipients);
    const removeDeletedClient = async (userId: string, clientId: string): Promise<void> => {
      delete payload.recipients[userId][clientId];
      await this.userRepository.removeClientFromUser(userId, clientId);
    };
    await this.removePayload(recipients, removeDeletedClient, conversationEntity, payload);
  }

  /**
   * Handle the missing client mismatch.
   *
   * @param recipients User client map containing redundant clients
   * @param payload Payload of the request
   * @param conversationEntity Conversation entity
   * @param eventInfoEntity Info about event
   * @returns Resolves with the updated payload
   */
  private async handleMissing(
    recipients: UserClients,
    payload: NewOTRMessage,
    conversationEntity: Conversation = undefined,
    eventInfoEntity: EventInfoEntity,
  ): Promise<NewOTRMessage> {
    const missingUserIds = Object.keys(recipients);

    if (missingUserIds.length === 0) {
      return payload;
    }

    this.logger.debug(`Message is missing clients of '${missingUserIds.length}' users`, recipients);

    const {genericMessage, timestamp} = eventInfoEntity;

    if (conversationEntity !== undefined) {
      const knownUserIds = conversationEntity.participating_user_ids();
      const unknownUserIds = getDifference(knownUserIds, missingUserIds);

      if (unknownUserIds.length > 0) {
        this.conversationRepository.addMissingMember(conversationEntity, unknownUserIds, timestamp - 1);
      }
    }

    const newPayload = await this.cryptographyRepository.encryptGenericMessage(recipients, genericMessage, payload);

    await Promise.all(
      missingUserIds.map(userId => {
        return this.userRepository.getClientsByUserId(userId, false).then(clients => {
          return Promise.all(clients.map(client => this.userRepository.addClientToUser(userId, client)));
        });
      }),
    );

    this.conversationRepository.verificationStateHandler.onClientsAdded(missingUserIds);

    return newPayload;
  }

  /**
   * Handle the redundant client mismatch.
   *
   * @note Contains clients of which the backend is sure that they should not be recipient of a message but cannot say whether they exist.
   *   Normally only contains clients of users no longer participating in a conversation.
   *   Sometimes clients of the self user are listed. Thus we cannot remove the payload for all the clients of a user without checking.
   * @param recipients User client map containing redundant clients
   * @param payload Payload of the request
   * @param conversationEntity Conversation entity
   * @returns Resolves when the payload got updated
   */
  private async handleRedundant(
    recipients: UserClients,
    payload: NewOTRMessage,
    conversationEntity?: Conversation,
  ): Promise<void> {
    if (Object.entries(recipients).length === 0) {
      return;
    }
    this.logger.debug(`Message contains redundant clients of '${Object.keys(recipients).length}' users`, recipients);
    const removeRedundantClient = (userId: string, clientId: string) => {
      delete payload.recipients[userId][clientId];
    };
    await this.removePayload(recipients, removeRedundantClient, conversationEntity, payload);
  }

  /**
   * Starts removal functions.
   *
   * @param recipients User client map
   * @param clientFn Function to remove clients
   * @param conversationEntity Conversation entity
   * @param payload Initial payload resulting in a 412
   */
  async removePayload(
    recipients: UserClients,
    clientFn: (userId: string, clientId: string) => void | Promise<void>,
    conversationEntity: Conversation = undefined,
    payload: NewOTRMessage,
  ): Promise<void> {
    const removeDeletedUser = async (userId: string): Promise<void> => {
      const clientIdsOfUser = Object.keys(payload.recipients[userId]);
      const noRemainingClients = !clientIdsOfUser.length;

      if (noRemainingClients && typeof conversationEntity !== 'undefined') {
        const result = await this.userRepository.getUserFromBackend(userId);
        const isDeleted = result?.deleted === true;
        if (isDeleted) {
          if (conversationEntity.isGroup()) {
            const timestamp = this.serverTimeHandler.toServerTimestamp();
            const memberLeaveEvent = EventBuilder.buildMemberLeave(conversationEntity, userId, false, timestamp);
            this.eventRepository.injectEvent(memberLeaveEvent);
          } else {
            amplify.publish(WebAppEvents.USER.UPDATE, userId);
          }
        }
      }

      delete payload.recipients[userId];
    };

    for (const [userId, clientIds = []] of Object.entries(recipients)) {
      for (const clientId of clientIds) {
        await clientFn(userId, clientId);
      }

      await removeDeletedUser(userId);
    }
  }
}
