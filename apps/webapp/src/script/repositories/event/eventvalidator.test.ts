/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {CONVERSATION_TYPING} from '@wireapp/api-client/lib/conversation/data/';
import {
  ConversationMemberJoinEvent,
  ConversationOtrMessageAddEvent,
  ConversationTypingEvent,
  CONVERSATION_EVENT,
} from '@wireapp/api-client/lib/event/';

import {EventSource} from './eventsource';
import {EventValidation} from './eventvalidation';
import {validateEvent} from './eventvalidator';

describe('EventValidator', () => {
  describe('validateEvent', () => {
    it('handles "conversation.typing" events', () => {
      const event: ConversationTypingEvent = {
        conversation: '3da298fd-0ed4-4e51-863c-bfd2f5b9089b',
        data: {status: CONVERSATION_TYPING.STARTED},
        from: 'ce1a2792-fb51-4977-a8e5-7a1dd8f2bb0b',
        time: '2019-09-10T16:16:25.635Z',
        type: CONVERSATION_EVENT.TYPING,
      };

      const source = EventSource.WEBSOCKET;
      const result = validateEvent(event, source, undefined);

      expect(result).toBe(EventValidation.VALID);
    });

    it('ignores duplicate-risk events replayed on the notification stream', () => {
      const eventTime = '2026-05-28T06:37:31.673Z';

      const event: ConversationMemberJoinEvent = {
        conversation: '939d0410-a17e-499e-804b-e7a8503415ae',
        data: {user_ids: ['30c6d863-6d9d-41ba-882d-fbcdc32b75a8']},
        from: '30c6d863-6d9d-41ba-882d-fbcdc32b75a8',
        time: eventTime,
        type: CONVERSATION_EVENT.MEMBER_JOIN,
      };

      const result = validateEvent(event, EventSource.NOTIFICATION_STREAM, eventTime);

      expect(result).toBe(EventValidation.OUTDATED_TIMESTAMP);
    });

    it('allows OTR messages with the same timestamp as lastEventDate on the notification stream', () => {
      const eventTime = '2026-05-28T06:37:31.673Z';

      const event: ConversationOtrMessageAddEvent = {
        conversation: '939d0410-a17e-499e-804b-e7a8503415ae',
        data: {recipient: 'a66c7dc1e8ffa326', sender: 'c9878bbba7a1f9ab', text: 'encrypted'},
        from: '30c6d863-6d9d-41ba-882d-fbcdc32b75a8',
        time: eventTime,
        type: CONVERSATION_EVENT.OTR_MESSAGE_ADD,
      };

      const result = validateEvent(event, EventSource.NOTIFICATION_STREAM, eventTime);

      expect(result).toBe(EventValidation.VALID);
    });
  });
});
