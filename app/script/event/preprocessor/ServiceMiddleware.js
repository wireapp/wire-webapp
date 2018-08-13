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

'use strict';

window.z = window.z || {};
window.z.event = z.event || {};
window.z.event.preprocessor = z.event.preprocessor || {};

z.event.preprocessor.ServiceMiddleware = class ServiceMiddleware {
  /**
   * Construct a new ServiceMiddleware.
   *
   * @param {z.conversation.UserRepository} userRepository - Repository to handle user related tasks
   */
  constructor(userRepository) {
    this.userRepository = userRepository;
    this.logger = new z.util.Logger('z.event.preprocessor.ServiceMiddleware', z.config.LOGGER.OPTIONS);
  }

  processEvent(event) {
    switch (event.type) {
      case z.event.Client.CONVERSATION.ONE2ONE_CREATION:
      case z.event.Client.CONVERSATION.GROUP_CREATION:
        return this._processConversationCreationEvent(event);
      case z.event.Backend.CONVERSATION.MEMBER_JOIN:
        return this._processMemberJoinEvent(event);

      default:
        return Promise.resolve(event);
    }
  }

  _processMemberJoinEvent(event) {
    this.logger.info(`Preprocessing event of type ${event.type}`);
    return this._containsBots(event.data.user_ids).then(containsBots => {
      return !containsBots ? event : Object.assign({}, event, {hasBots: true});
    });
  }

  _processConversationCreationEvent(event) {
    this.logger.info(`Preprocessing event of type ${event.type}`);
    return this._containsBots(event.data.userIds).then(containsBots => {
      return !containsBots ? event : Object.assign({}, event, {hasBots: true});
    });
  }

  _containsBots(userIds) {
    const userPromises = userIds.map(userId => this.userRepository.get_user_by_id(userId));
    return Promise.all(userPromises).then(userEntities => {
      return userEntities.some(userEntity => userEntity.isBot);
    });
  }
};
