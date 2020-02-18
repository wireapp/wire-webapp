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

import {ClientEvent} from '../Client';
import {BackendEvent} from '../Backend';

export class ServiceMiddleware {
  /**
   * Construct a new ServiceMiddleware.
   *
   * @param {ConverationRepository} conversationRepository Repository to handle conversation related tasks
   * @param {UserRepository} userRepository Repository to handle user related tasks
   */
  constructor(conversationRepository, userRepository) {
    this.userRepository = userRepository;
    this.conversationRepository = conversationRepository;
    this.logger = getLogger('ServiceMiddleware');
  }

  processEvent(event) {
    switch (event.type) {
      case ClientEvent.CONVERSATION.ONE2ONE_CREATION:
        return this._process1To1ConversationCreationEvent(event);

      case BackendEvent.CONVERSATION.MEMBER_JOIN:
        return this._processMemberJoinEvent(event);

      default:
        return Promise.resolve(event);
    }
  }

  _processMemberJoinEvent(event) {
    this.logger.info(`Preprocessing event of type ${event.type}`);

    const {conversation: conversationId, data: eventData} = event;
    const selfUserId = this.userRepository.self().id;
    const containsSelfUser = eventData.user_ids.includes(selfUserId);

    const getUsersPromise = containsSelfUser
      ? this.conversationRepository
          .get_conversation_by_id(conversationId)
          .then(conversationEntity => conversationEntity.participating_user_ids())
      : Promise.resolve(eventData.user_ids);

    return getUsersPromise
      .then(userIds => this._containsService(userIds))
      .then(hasService => (hasService ? this._decorateWithHasServiceFlag(event) : event));
  }

  _process1To1ConversationCreationEvent(event) {
    this.logger.info(`Preprocessing event of type ${event.type}`);
    return this._containsService(event.data.userIds).then(hasService => {
      return hasService ? this._decorateWithHasServiceFlag(event) : event;
    });
  }

  _containsService(userIds) {
    return this.userRepository.get_users_by_id(userIds).then(userEntities => {
      return userEntities.some(userEntity => userEntity.isService);
    });
  }

  _decorateWithHasServiceFlag(event) {
    const updatedData = {...event.data, has_service: true};
    return {...event, data: updatedData};
  }
}
