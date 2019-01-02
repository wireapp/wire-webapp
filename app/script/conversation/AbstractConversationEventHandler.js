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

window.z = window.z || {};
window.z.conversation = z.conversation || {};

/**
 * @typedef {Object} EventHandlingConfig - Object representing conversation event handlers
 * @property {() => void} [eventId: string] - an event handler function
 */

z.conversation.AbstractConversationEventHandler = class AbstractConversationEventHandler {
  /**
   * Abstract class that represents an entity that can react to a conversation event.
   */
  constructor() {
    this.eventHandlingConfig = {};
  }

  /**
   * Adds an event handling config to the current instance.
   *
   * @param {EventHandlingConfig} eventHandlingConfig - Config containing events name and the associated callback
   * @returns {void} No return value
   */
  setEventHandlingConfig(eventHandlingConfig) {
    this.eventHandlingConfig = eventHandlingConfig;
  }

  /**
   * Handles a conversation event.
   *
   * @param {z.entity.Conversation} conversationEntity - the conversation the event relates to
   * @param {Object} eventJson - JSON data for event
   * @param {z.event.EventRepository.SOURCE} eventSource - Source of event
   * @returns {Promise} Resolves when event was handled
   */
  handleConversationEvent(conversationEntity, eventJson, eventSource = z.event.EventRepository.SOURCE.STREAM) {
    const handler = this.eventHandlingConfig[eventJson.type] || (() => Promise.resolve());
    return handler.bind(this)(conversationEntity, eventJson);
  }
};
