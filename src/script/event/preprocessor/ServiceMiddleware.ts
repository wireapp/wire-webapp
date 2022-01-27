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

import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event/';
import {container} from 'tsyringe';

import {getLogger, Logger} from 'Util/Logger';

import {UserState} from '../../user/UserState';
import type {ConversationRepository} from '../../conversation/ConversationRepository';
import {EventRecord} from '../../storage/record/EventRecord';
import type {UserRepository} from '../../user/UserRepository';
import {ClientEvent} from '../Client';
import type {QualifiedId} from '@wireapp/api-client/src/user/';
import {QualifiedUserId} from '@wireapp/protocol-messaging';
import {matchQualifiedIds} from 'Util/QualifiedId';

interface MemberJoinEvent {
  user_ids: string[];
  users: {
    conversation_role: string;
    id: string;
    qualified_id?: QualifiedUserId;
  }[];
}

interface One2OneCreationEvent {
  userIds: QualifiedId[];
}
type HandledEvents = MemberJoinEvent | One2OneCreationEvent;

export class ServiceMiddleware {
  private readonly userRepository: UserRepository;
  private readonly conversationRepository: ConversationRepository;
  private readonly logger: Logger;

  constructor(
    conversationRepository: ConversationRepository,
    userRepository: UserRepository,
    private readonly userState = container.resolve(UserState),
  ) {
    this.userRepository = userRepository;
    this.conversationRepository = conversationRepository;
    this.logger = getLogger('ServiceMiddleware');
  }

  processEvent(event: EventRecord<HandledEvents>): Promise<EventRecord> {
    switch (event.type) {
      case ClientEvent.CONVERSATION.ONE2ONE_CREATION:
        return this._process1To1ConversationCreationEvent(event as EventRecord<One2OneCreationEvent>);

      case CONVERSATION_EVENT.MEMBER_JOIN:
        return this._processMemberJoinEvent(event as EventRecord<MemberJoinEvent>);

      default:
        return Promise.resolve(event);
    }
  }

  private async _processMemberJoinEvent(event: EventRecord<MemberJoinEvent>) {
    this.logger.info(`Preprocessing event of type ${event.type}`);

    const {conversation: conversationId, qualified_conversation, data: eventData} = event;
    const qualifiedConversation = qualified_conversation || {domain: '', id: conversationId};
    const userQualifiedIds = this.extractQualifiedUserIds(eventData);
    const selfUser = this.userState.self();
    const containsSelfUser = userQualifiedIds.find((user: QualifiedId) => matchQualifiedIds(user, selfUser));

    const userIds: QualifiedId[] = containsSelfUser
      ? await this.conversationRepository
          .getConversationById(qualifiedConversation)
          .then(conversationEntity => conversationEntity.participating_user_ids())
      : userQualifiedIds;

    const hasService = await this._containsService(userIds);
    return hasService ? this._decorateWithHasServiceFlag(event) : event;
  }

  private extractQualifiedUserIds(data: MemberJoinEvent): QualifiedId[] {
    const userIds = data.users
      ? data.users.map(user => user.qualified_id || {domain: '', id: user.id})
      : data.user_ids.map(id => ({domain: '', id}));
    return userIds;
  }

  private async _process1To1ConversationCreationEvent(event: EventRecord<One2OneCreationEvent>) {
    this.logger.info(`Preprocessing event of type ${event.type}`);
    const hasService = await this._containsService(event.data.userIds);
    return hasService ? this._decorateWithHasServiceFlag(event) : event;
  }

  private async _containsService(users: QualifiedId[]) {
    const userEntities = await this.userRepository.getUsersById(users);
    return userEntities.some(userEntity => userEntity.isService);
  }

  private _decorateWithHasServiceFlag(event: EventRecord) {
    const updatedData = {...event.data, has_service: true};
    return {...event, data: updatedData};
  }
}
