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

import {amplify} from 'amplify';
import {WebAppEvents} from '@wireapp/webapp-events';
import type {ClientMismatch, NewOTRMessage, UserClients} from '@wireapp/api-client/src/conversation/';

import {Logger, getLogger} from 'Util/Logger';
import {getDifference} from 'Util/ArrayUtil';
import {isQualifiedUserClientEntityMap} from 'Util/TypePredicateUtil';

import type {ConversationRepository} from './ConversationRepository';
import type {CryptographyRepository} from '../cryptography/CryptographyRepository';
import type {UserRepository} from '../user/UserRepository';
import type {EventInfoEntity} from './EventInfoEntity';
import type {Conversation} from '../entity/Conversation';
import {Config} from '../Config';

export class ClientMismatchHandler {
  private readonly logger: Logger;

  constructor(
    private readonly conversationRepositoryProvider: () => ConversationRepository,
    private readonly cryptographyRepository: CryptographyRepository,
    private readonly userRepository: UserRepository,
  ) {
    this.logger = getLogger('ClientMismatchHandler');
  }

  /**
   * Handle client mismatch response from backend by:
   * - Removing encrypted payload for deleted or redundant clients (keeps payload size small)
   * - Updating local database records for deleted clients
   * - Triggering events when users have no more clients (to show member leave message)
   * @note As part of 412 or general response when sending encrypted message
   * @param eventInfoEntity Info about message
   * @param clientMismatch Client mismatch object containing client user maps for deleted, missing and obsolete clients
   * @param payload Initial payload which resulted in a HTTP error 412
   * @returns Resolves when mismatch was handled with updated OTR message
   */
  async onClientMismatch(
    eventInfoEntity: EventInfoEntity,
    clientMismatch: ClientMismatch,
    payload?: NewOTRMessage<string>,
  ): Promise<NewOTRMessage<string> | undefined> {
    const {deleted, missing, redundant} = clientMismatch;
    // Note: Broadcast messages have an empty conversation ID
    let conversationEntity: Conversation | undefined;

    if (eventInfoEntity.conversationId !== '') {
      conversationEntity = await this.conversationRepositoryProvider().getConversationById(
        eventInfoEntity.conversationId,
      );
    }

    await this.removeClientsFromPayload(redundant, false, conversationEntity, payload);
    await this.removeClientsFromPayload(deleted, true, conversationEntity, payload);
    return this.handleMissing(missing, eventInfoEntity, conversationEntity, payload);
  }

  /**
   * Fetches missing clients from participants. Triggers conversation verification state updates. Re-encrypts message to include encrypted payload for missed clients.
   * @deprecated
   * TODO(Federation): This code cannot be used with federation and will be replaced with our core.
   */
  private async handleMissing(
    recipients: UserClients,
    eventInfoEntity: EventInfoEntity,
    conversationEntity?: Conversation,
    payload?: NewOTRMessage<string>,
  ): Promise<NewOTRMessage<string> | undefined> {
    const missingUserIds = Object.keys(recipients);

    if (missingUserIds.length === 0) {
      return payload;
    }

    this.logger.debug(`Message is missing clients of '${missingUserIds.length}' users`, recipients);

    const {genericMessage, timestamp} = eventInfoEntity;

    if (conversationEntity !== undefined) {
      const knownUsers = conversationEntity.participating_user_ids();
      // TODO(Federation): This code does not consider federated environments / conversations as this function is deprecated
      const unknownUsers = getDifference(
        knownUsers.map(user => user.id),
        missingUserIds,
      ).map(id => ({domain: Config.getConfig().FEATURE.FEDERATION_DOMAIN || null, id}));

      if (unknownUsers.length > 0) {
        this.conversationRepositoryProvider().addMissingMember(conversationEntity, unknownUsers, timestamp - 1);
      }
    }

    const missingUserEntities = missingUserIds.map(missingUserId => this.userRepository.findUserById(missingUserId));

    const usersMap = await this.userRepository.getClientsByUsers(missingUserEntities, false);
    if (isQualifiedUserClientEntityMap(usersMap)) {
      await Promise.all(
        Object.entries(usersMap).map(([domain, userClientsMap]) =>
          Object.entries(userClientsMap).map(([userId, clients]) =>
            Promise.all(clients.map(client => this.userRepository.addClientToUser(userId, client, false, domain))),
          ),
        ),
      );
    } else {
      await Promise.all(
        Object.entries(usersMap).map(([userId, clients]) =>
          Promise.all(clients.map(client => this.userRepository.addClientToUser(userId, client, false, null))),
        ),
      );
    }

    this.conversationRepositoryProvider().verificationStateHandler.onClientsAdded(
      missingUserIds.map(id => ({domain: Config.getConfig().FEATURE.FEDERATION_DOMAIN || null, id})),
    );

    if (payload) {
      return this.cryptographyRepository.encryptGenericMessage(recipients, genericMessage, payload);
    }

    return undefined;
  }

  /**
   * Modifies payload in-place and removes entries for redundant or deleted clients. It also triggers the removal of clients from the local database if clients have been detected as deleted on backend. On top of that it "amplifies" that users have left the conversation (when there are no more clients for a user).
   * @deprecated
   * TODO(Federation): This code cannot be used with federation and will be replaced with our core.
   */
  async removeClientsFromPayload(
    recipients: UserClients,
    removeLocallyStoredClient: boolean,
    conversationEntity?: Conversation,
    payload?: NewOTRMessage<string>,
  ): Promise<void> {
    const removeDeletedUser = async (userId: string): Promise<void> => {
      const clientIdsOfUser = Object.keys(payload.recipients[userId]);
      const noRemainingClients = clientIdsOfUser.length === 0;

      if (noRemainingClients && typeof conversationEntity !== 'undefined') {
        const backendUser = await this.userRepository.getUserFromBackend(userId);
        const isDeleted = backendUser?.deleted === true;

        if (isDeleted && conversationEntity.inTeam) {
          amplify.publish(WebAppEvents.TEAM.MEMBER_LEAVE, conversationEntity.team_id, userId);
        }
      }

      delete payload.recipients[userId];
    };

    const removeDeletedClient = async (userId: string, clientId: string): Promise<void> => {
      if (payload?.recipients?.[userId]) {
        delete payload.recipients[userId][clientId];
      }
      if (removeLocallyStoredClient) {
        await this.userRepository.removeClientFromUser(userId, clientId, null);
      }
    };

    for (const [userId, clientIds = []] of Object.entries(recipients)) {
      for (const clientId of clientIds) {
        await removeDeletedClient(userId, clientId);
      }

      if (payload?.recipients?.[userId]) {
        await removeDeletedUser(userId);
      }
    }
  }
}
