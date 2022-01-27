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

import {ConversationEvent} from '@wireapp/api-client/src/event';
import {ClientConversationEvent} from './EventBuilder';
import type {Conversation} from '../entity/Conversation';

export type EventHandlingConfig = {[eventId: string]: (conversationEntity: Conversation) => void | Promise<void>};

/**
 * Abstract class that represents an entity that can react to a conversation event.
 */
export class AbstractConversationEventHandler {
  private eventHandlingConfig: EventHandlingConfig;

  constructor() {
    this.eventHandlingConfig = {};
  }

  /**
   * Adds an event handling config to the current instance.
   *
   * @param eventHandlingConfig Config containing events name and the associated callback
   */
  setEventHandlingConfig(eventHandlingConfig: EventHandlingConfig): void {
    this.eventHandlingConfig = eventHandlingConfig;
  }

  /**
   * Handles a conversation event.
   *
   * @param conversationEntity the conversation the event relates to
   * @param eventJson JSON data for the event
   */
  handleConversationEvent(
    conversationEntity: Conversation,
    eventJson: ConversationEvent | ClientConversationEvent,
  ): Promise<void> {
    const handler = this.eventHandlingConfig[eventJson.type] || (() => Promise.resolve());
    return handler.bind(this)(conversationEntity, eventJson);
  }
}
