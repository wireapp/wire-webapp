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
   * @param {z.conversation.ConversationRepository} conversationRepository - Repository to handle conversation related tasks
   */
  constructor(conversationRepository) {
    this.conversationRepository = conversationRepository;
    this.logger = new z.util.Logger('z.event.preprocessor.ServiceMiddleware', z.config.LOGGER.OPTIONS);
  }

  preprocessEvent(event) {
    const HANDELED_EVENT_TYPES = [
      z.event.Client.CONVERSATION.ONE2ONE_CREATION,
      z.event.Client.CONVERSATION.GROUP_CREATION,
      z.event.Backend.CONVERSATION.MEMBER_JOIN,
    ];

    if (!HANDELED_EVENT_TYPES.includes(event.type)) {
      return event;
    }

    this.logger.info(`Preprocessing event of type ${event.type}`);
    return this.conversationRepository.get_conversation_by_id(event.conversation).then(conversation => {
      const hasBots = conversation.getNumberOfBots() > 0;
      if (hasBots) {
        return Object.assign({}, event, {
          hasBots: true,
        });
      }
      return event;
    });
  }
};
