/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {FEDERATION_EVENT} from '@wireapp/api-client/lib/event';
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {container} from 'tsyringe';

import {ConversationState} from 'src/script/conversation/ConversationState';
import {ConversationStatus} from 'src/script/conversation/ConversationStatus';
import {EventBuilder} from 'src/script/conversation/EventBuilder';
import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {ServerTimeHandler} from 'src/script/time/serverTimeHandler';

import {
  getUsersToDeleteFromFederatedConversations,
  getFederationDeleteEventUpdates,
} from './ConversationFederationUtils';

import {EventProcessor, IncomingEvent} from '../../EventProcessor';
import {EventRepository} from '../../EventRepository';

export class FederationEventProcessor implements EventProcessor {
  constructor(
    private eventRepository: EventRepository,
    private serverTimeHandler: ServerTimeHandler,
    private selfUser: User,
    private conversationState: ConversationState = container.resolve(ConversationState),
  ) {}

  async processEvent(event: IncomingEvent) {
    const {type} = event;

    switch (type) {
      case FEDERATION_EVENT.FEDERATION_DELETE:
        const {domain: deletedDomain} = event;
        await this.onFederationDelete(deletedDomain);
        break;

      case FEDERATION_EVENT.FEDERATION_CONNECTION_REMOVED:
        const {domains: deletedDomains} = event;
        await this.onFederationConnectionRemove(deletedDomains);
        break;
    }
  }

  /**
   * For the `federation.delete` event: (Backend A has stopped federating with us)
      - receive the event from backend
      - leave the conversations locally that are owned by the backend A which was deleted.
      - remove the deleted backend A users locally from our own conversations.
      - insert system message to the affected conversations about federation termination.
   * @param deletedDomain the domain that stopped federating
   */
  private onFederationDelete = async (deletedDomain: string) => {
    const {conversationsToDeleteUsers, conversationsToLeave, conversationsToDisable} = getFederationDeleteEventUpdates(
      deletedDomain,
      this.conversationState.conversations(),
    );

    conversationsToLeave.forEach(async conversation => {
      await this.removeMembersLocally(conversation, [this.selfUser]);
      await this.insertFederationStopSystemMessage(conversation, [deletedDomain]);
    });

    conversationsToDisable.forEach(async conversation => {
      conversation.status(ConversationStatus.PAST_MEMBER);
      conversation.firstUserEntity()?.markConnectionAsUnknown();
      await this.insertFederationStopSystemMessage(conversation, [deletedDomain]);
    });

    conversationsToDeleteUsers.forEach(async ({conversation, users}) => {
      await this.insertFederationStopSystemMessage(conversation, [deletedDomain]);
      await this.removeDeletedFederationUsers(conversation, users);
    });
  };

  /**
   * For the `federation.connectionRemoved` event: (Backend A & B stopped federating, user is on C)
    - receive the event from backend
    - Identify all conversations that are not owned from A or B domain and that contain users from A and B
      - remove users from A and B from those conversations
      - insert system message in those conversations about backend A and B stopping to federate
    - identify all conversations owned by domain A that contains users from B
      - remove users from B from those conversations
      - insert system message in those conversations about backend A and B stopping to federate
    - Identify all conversations owned by domain B that contains users from A
      - remove users from A from those conversations
      - insert system message in those conversations about backend A and B stopping to federate
   * @param domains The domains that stopped federating with each other
   */
  private readonly onFederationConnectionRemove = async (domains: string[]) => {
    const allConversations = this.conversationState.conversations();

    const result = getUsersToDeleteFromFederatedConversations(domains, allConversations);

    for (const {conversation, usersToRemove} of result) {
      await this.insertFederationStopSystemMessage(conversation, domains);
      await this.removeDeletedFederationUsers(
        conversation,
        usersToRemove.map(user => user.qualifiedId),
      );
    }
  };

  private readonly removeDeletedFederationUsers = async (conversation: Conversation, users: QualifiedId[]) => {
    if (users.length === 0) {
      return;
    }
    await this.removeMembersLocally(conversation, users);
  };

  private readonly insertFederationStopSystemMessage = async (conversation: Conversation, domains: string[]) => {
    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const event = EventBuilder.buildFederationStop(conversation, this.selfUser, domains, currentTimestamp);
    await this.eventRepository.injectEvent(event, EventRepository.SOURCE.INJECTED);
  };

  /**
   * Will inject a `member-leave` that will then trigger the local removal of the user in the conversation
   * @param conversation the conversation in which we want to remove users
   * @param userIds the users to remove from the conversation
   */
  private async removeMembersLocally(conversation: Conversation, userIds: QualifiedId[]) {
    const currentTimestamp = this.serverTimeHandler.toServerTimestamp();
    const event = EventBuilder.buildMemberLeave(conversation, userIds, '', currentTimestamp);
    // Injecting the event will trigger all the handlers that will then actually remove the users from the conversation
    await this.eventRepository.injectEvent(event);
  }
}
