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
window.z.conversation = z.conversation || {};

z.conversation.ConversationMessageTimerHandler = class ConversationStateHandler extends z.conversation
  .AbstractConversationEventHandler {
  /**
   * Construct a new conversation state handler.
   * @param {ConversationService} conversationService - Service for conversation related backend interactions
   * @param {ConversationMapper} conversationMapper - Helper for converting raw data to conversation entities
   */
  constructor(conversationService, conversationMapper) {
    super();
    this.setEventHandlingConfig({
      [z.event.Backend.CONVERSATION.MESSAGE_TIMER_UPDATE]: this._updateMessageTimer.bind(this),
    });
    this.conversationService = conversationService;
    this.conversationMapper = conversationMapper;
  }

  /**
   * A conversation's message timer was changed
   *
   * @private
   * @param {Conversation} conversationEntity - Conversation entity which message timer was changed
   * @param {Object} eventJson - JSON data of 'conversation.message-timer-update' event
   * @returns {Promise} Resolves when the event was handled
   */
  _updateMessageTimer(conversationEntity, eventJson) {
    const updates = {globalMessageTimer: eventJson.data.message_timer};
    this.conversationMapper.update_properties(conversationEntity, updates);
    return Promise.resolve(conversationEntity);
  }
};
