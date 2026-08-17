/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {
  CONVERSATION_EVENT,
  type ConversationDeleteEvent,
  type ConversationDeleteMeetingEvent,
  type ConversationEvent,
} from './conversationEvent';

describe('CONVERSATION_EVENT', () => {
  it('recognizes conversation.delete-meeting with the same payload as conversation.delete', () => {
    const event: ConversationDeleteMeetingEvent = {
      conversation: 'conversation-id',
      data: null,
      from: 'user-id',
      qualified_conversation: {domain: 'example.com', id: 'conversation-id'},
      time: '2026-08-17T10:00:00.000Z',
      type: CONVERSATION_EVENT.DELETE_MEETING,
    };

    const asConversationEvent: ConversationEvent = event;

    expect(CONVERSATION_EVENT.DELETE_MEETING).toBe('conversation.delete-meeting');
    expect(asConversationEvent.type).toBe('conversation.delete-meeting');
    expect(asConversationEvent.data).toBeNull();
  });

  it('allows conversation.delete-meeting without from, matching conversation.delete', () => {
    const event: ConversationDeleteMeetingEvent = {
      conversation: 'conversation-id',
      data: null,
      qualified_conversation: {domain: 'example.com', id: 'conversation-id'},
      time: '2026-08-17T10:00:00.000Z',
      type: CONVERSATION_EVENT.DELETE_MEETING,
    };

    expect(event.from).toBeUndefined();
    expect(event.data).toBeNull();
  });

  it('keeps conversation.delete payload unchanged', () => {
    const event: ConversationDeleteEvent = {
      conversation: 'conversation-id',
      data: null,
      from: 'user-id',
      time: '2026-08-17T10:00:00.000Z',
      type: CONVERSATION_EVENT.DELETE,
    };

    const asConversationEvent: ConversationEvent = event;

    expect(CONVERSATION_EVENT.DELETE).toBe('conversation.delete');
    expect(asConversationEvent.type).toBe('conversation.delete');
    expect(asConversationEvent.data).toBeNull();
  });
});
