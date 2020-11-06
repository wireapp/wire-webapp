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

import {CONVERSATION_EVENT} from '@wireapp/api-client/src/event';
import {UserState} from '../../user/UserState';
import {container} from 'tsyringe';
import {getLogger, Logger} from 'Util/Logger';
import type {ConversationRepository} from '../../conversation/ConversationRepository';
import {EventRecord} from '../../storage/EventRecord';
import type {UserRepository} from '../../user/UserRepository';
import {ClientEvent} from '../Client';

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

  processEvent(event: EventRecord): Promise<EventRecord> {
    switch (event.type) {
      case ClientEvent.CONVERSATION.ONE2ONE_CREATION:
        return this._process1To1ConversationCreationEvent(event);

      case CONVERSATION_EVENT.MEMBER_JOIN:
        return this._processMemberJoinEvent(event);

      default:
        return Promise.resolve(event);
    }
  }

  private async _processMemberJoinEvent(event: EventRecord) {
    this.logger.info(`Preprocessing event of type ${event.type}`);

    const {conversation: conversationId, data: eventData} = event;
    const selfUserId = this.userState.self().id;
    const containsSelfUser = eventData.user_ids.includes(selfUserId);

    const userIds = containsSelfUser
      ? await this.conversationRepository
          .get_conversation_by_id(conversationId)
          .then(conversationEntity => conversationEntity.participating_user_ids())
      : eventData.user_ids;

    const hasService = await this._containsService(userIds);
    return hasService ? this._decorateWithHasServiceFlag(event) : event;
  }

  private async _process1To1ConversationCreationEvent(event: EventRecord) {
    this.logger.info(`Preprocessing event of type ${event.type}`);
    const hasService = await this._containsService(event.data.userIds);
    return hasService ? this._decorateWithHasServiceFlag(event) : event;
  }

  private async _containsService(userIds: string[]) {
    const userEntities = await this.userRepository.getUsersById(userIds);
    return userEntities.some(userEntity => userEntity.isService);
  }

  private _decorateWithHasServiceFlag(event: EventRecord) {
    const updatedData = {...event.data, has_service: true};
    return {...event, data: updatedData};
  }
}
