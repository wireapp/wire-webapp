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

import {CONVERSATION_EVENT, ConversationMemberJoinEvent} from '@wireapp/api-client/lib/event/';
import type {QualifiedId} from '@wireapp/api-client/lib/user/';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {MemberJoinEvent, OneToOneCreationEvent} from 'Repositories/conversation/EventBuilder';
import {User} from 'Repositories/entity/User';
import type {UserRepository} from 'Repositories/user/UserRepository';
import {getLogger, Logger} from 'Util/Logger';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {ClientEvent} from '../Client';
import {EventMiddleware, IncomingEvent} from '../EventProcessor';

/**
 * will detect member join event that contain a service and add a flag to it
 */
export class ServiceMiddleware implements EventMiddleware {
  private readonly logger: Logger;

  constructor(
    private readonly conversationRepository: ConversationRepository,
    private readonly userRepository: UserRepository,
    private readonly selfUser: User,
  ) {
    this.logger = getLogger('ServiceMiddleware');
  }

  processEvent(event: IncomingEvent) {
    switch (event.type) {
      case ClientEvent.CONVERSATION.ONE2ONE_CREATION:
        return this.process1To1ConversationCreationEvent(event);

      case CONVERSATION_EVENT.MEMBER_JOIN:
        return this.processMemberJoinEvent(event);

      default:
        return Promise.resolve(event);
    }
  }

  private async processMemberJoinEvent(event: MemberJoinEvent | ConversationMemberJoinEvent) {
    this.logger.info(`Preprocessing event of type ${event.type}`);

    const {conversation: conversationId, qualified_conversation, data: eventData} = event;
    const qualifiedConversation = qualified_conversation || {domain: '', id: conversationId};
    const userQualifiedIds = this.extractQualifiedUserIds(eventData);
    const containsSelfUser = userQualifiedIds.find((user: QualifiedId) => matchQualifiedIds(user, this.selfUser));

    const userIds: QualifiedId[] = containsSelfUser
      ? await this.conversationRepository
          .getConversationById(qualifiedConversation)
          .then(conversationEntity => conversationEntity.participating_user_ids())
      : userQualifiedIds;

    const hasService = await this.containsService(userIds);
    return hasService ? this.decorateWithHasServiceFlag(event) : event;
  }

  private extractQualifiedUserIds(data: MemberJoinEvent['data'] | ConversationMemberJoinEvent['data']): QualifiedId[] {
    const users = 'users' in data ? data.users : undefined;
    const userIds = users
      ? users.map(user => user.qualified_id || {domain: '', id: user.id})
      : data.user_ids.map(id => ({domain: '', id}));
    return userIds;
  }

  private async process1To1ConversationCreationEvent(event: OneToOneCreationEvent) {
    this.logger.info(`Preprocessing event of type ${event.type}`);
    const hasService = await this.containsService(event.data.userIds);
    return hasService ? this.decorateWithHasServiceFlag(event) : event;
  }

  private async containsService(users: QualifiedId[]) {
    const userEntities = await this.userRepository.getUsersById(users);
    return userEntities.some(userEntity => userEntity.isService);
  }

  private decorateWithHasServiceFlag(event: MemberJoinEvent | ConversationMemberJoinEvent | OneToOneCreationEvent) {
    const updatedData = {...event.data, has_service: true};
    return {...event, data: updatedData} as IncomingEvent;
  }
}
