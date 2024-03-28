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

import {
  CONVERSATION_TYPING,
  ConversationMemberJoinData,
  ConversationMessageTimerUpdateData,
  ConversationRenameData,
  ConversationTypingData,
} from '@wireapp/api-client/lib/conversation/data';
import {
  CONVERSATION_EVENT,
  ConversationMemberJoinEvent,
  ConversationMessageTimerUpdateEvent,
  ConversationRenameEvent,
  ConversationTypingEvent,
} from '@wireapp/api-client/lib/event';

import {ConversationMapper} from './ConversationMapper';

import {NotificationSource} from '../../notification';
import {MessageSendingState} from '../message';
import {PayloadBundle, PayloadBundleType} from '../message/PayloadBundle';

describe('ConversationMapper', () => {
  describe('"mapConversationEvent"', () => {
    it('maps "conversation.message-timer-update" events', () => {
      const event: ConversationMessageTimerUpdateEvent = {
        conversation: 'ed5e4cd5-85ab-4d9e-be59-4e1c0324a9d4',
        data: {
          message_timer: 2419200000,
        },
        from: '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0',
        time: '2018-08-01T09:40:25.481Z',
        type: CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE,
      };

      const incomingEvent = ConversationMapper.mapConversationEvent(
        event,
        NotificationSource.WEBSOCKET,
      ) as PayloadBundle & {
        content: ConversationMessageTimerUpdateData;
      };

      expect(incomingEvent.content).toBe(event.data);
      expect(incomingEvent.conversation).toBe(event.conversation);
      expect(incomingEvent.from).toBe(event.from);
      expect(typeof incomingEvent.id).toBe('string');
      expect(incomingEvent.messageTimer).toBe(0);
      expect(incomingEvent.state).toBe(MessageSendingState.INCOMING);
      expect(incomingEvent.timestamp).toBe(new Date(event.time).getTime());
      expect(incomingEvent.type).toBe(PayloadBundleType.TIMER_UPDATE);
    });

    it('maps "conversation.member-join" events', () => {
      const event: ConversationMemberJoinEvent = {
        conversation: '87591650-8676-430f-985f-dec8583f58cb',
        data: {
          user_ids: [
            'e023c681-7e51-43dd-a5d8-0f821e70a9c0',
            'b8a09877-7b73-4636-a664-95b2bda193b0',
            '5b068afd-1ef2-4860-9fbb-9c3c70a22f97',
          ],
        },
        from: '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0',
        time: '2018-07-12T09:43:34.442Z',
        type: CONVERSATION_EVENT.MEMBER_JOIN,
      };

      const incomingEvent = ConversationMapper.mapConversationEvent(
        event,
        NotificationSource.WEBSOCKET,
      ) as PayloadBundle & {
        content: ConversationMemberJoinData;
      };

      expect(incomingEvent.content).toBe(event.data);
      expect(incomingEvent.conversation).toBe(event.conversation);
      expect(incomingEvent.from).toBe(event.from);
      expect(typeof incomingEvent.id).toBe('string');
      expect(incomingEvent.messageTimer).toBe(0);
      expect(incomingEvent.state).toBe(MessageSendingState.INCOMING);
      expect(incomingEvent.timestamp).toBe(new Date(event.time).getTime());
      expect(incomingEvent.type).toBe(PayloadBundleType.MEMBER_JOIN);
    });

    it('maps "conversation.rename" events', () => {
      const event: ConversationRenameEvent = {
        conversation: 'ed5e4cd5-85ab-4d9e-be59-4e1c0324a9d4',
        data: {
          name: 'Tiny Timed Messages',
        },
        from: '39b7f597-dfd1-4dff-86f5-fe1b79cb70a0',
        time: '2018-08-01T12:01:21.629Z',
        type: CONVERSATION_EVENT.RENAME,
      };

      const incomingEvent = ConversationMapper.mapConversationEvent(
        event,
        NotificationSource.WEBSOCKET,
      ) as PayloadBundle & {
        content: ConversationRenameData;
      };

      expect(incomingEvent.content).toBe(event.data);
      expect(incomingEvent.conversation).toBe(event.conversation);
      expect(incomingEvent.from).toBe(event.from);
      expect(typeof incomingEvent.id).toBe('string');
      expect(incomingEvent.messageTimer).toBe(0);
      expect(incomingEvent.state).toBe(MessageSendingState.INCOMING);
      expect(incomingEvent.timestamp).toBe(new Date(event.time).getTime());
      expect(incomingEvent.type).toBe(PayloadBundleType.CONVERSATION_RENAME);
    });

    it('maps "conversation.typing" events', () => {
      const event: ConversationTypingEvent = {
        conversation: '508f14b9-ef4c-405d-bba9-5c4300cc1cbf',
        data: {status: CONVERSATION_TYPING.STARTED},
        from: '16d71f22-0f7b-425e-b4b3-5e288700ac1f',
        time: '2018-08-01T12:10:42.422Z',
        type: CONVERSATION_EVENT.TYPING,
      };

      const incomingEvent = ConversationMapper.mapConversationEvent(
        event,
        NotificationSource.WEBSOCKET,
      ) as PayloadBundle & {
        content: ConversationTypingData;
      };

      expect(incomingEvent.content).toBe(event.data);
      expect(incomingEvent.conversation).toBe(event.conversation);
      expect(incomingEvent.from).toBe(event.from);
      expect(typeof incomingEvent.id).toBe('string');
      expect(incomingEvent.messageTimer).toBe(0);
      expect(incomingEvent.state).toBe(MessageSendingState.INCOMING);
      expect(incomingEvent.timestamp).toBe(new Date(event.time).getTime());
      expect(incomingEvent.type).toBe(PayloadBundleType.TYPING);
    });
  });
});
