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

import {CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';

import {Conversation} from 'Repositories/entity/Conversation';
import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import type {IncomingEvent} from '../EventProcessor';
import {ConfirmationEvent} from 'Repositories/conversation/EventBuilder';
import {User} from 'Repositories/entity/User';
import {StatusType} from 'src/script/message/statusType';
import {createUuid} from 'Util/uuid';

import {ReceiptsMiddleware} from './ReceiptsMiddleware';

import {ClientEvent} from '../Client';
import {translateForTest} from 'Util/test/translateForTest';

function buildReadReceiptMiddleware() {
  const selfUser = new User(createUuid(), '', translateForTest);
  const eventService = {loadEvents: jest.fn((): never[] => []), replaceEvent: jest.fn()} as any;

  return [new ReceiptsMiddleware(eventService, {} as any, selfUser), {eventService, selfUser}] as const;
}

describe('ReceiptsMiddleware', () => {
  describe('processEvent', () => {
    it.each([
      [CONVERSATION_PROTOCOL.PROTEUS, CONVERSATION_TYPE.REGULAR, true],
      [CONVERSATION_PROTOCOL.MIXED, CONVERSATION_TYPE.REGULAR, false],
      [CONVERSATION_PROTOCOL.MLS, CONVERSATION_TYPE.REGULAR, false],
      [CONVERSATION_PROTOCOL.MLS, CONVERSATION_TYPE.ONE_TO_ONE, true],
    ])('sets receipt expectations for protocol %s and type %s', async (protocol, type, expected) => {
      const conversation = new Conversation('conversation', '', protocol, translateForTest);
      conversation.type(type);
      conversation.receiptMode(RECEIPT_MODE.ON);
      const repository = {
        getConversationById: jest.fn().mockResolvedValue(conversation),
      } as unknown as ConversationRepository;
      const middleware = new ReceiptsMiddleware({} as any, repository, new User('self', '', translateForTest));
      const event = {
        conversation: conversation.id,
        type: ClientEvent.CONVERSATION.MESSAGE_ADD,
        data: {expects_read_confirmation: true},
      };

      await middleware.processEvent(event as IncomingEvent);

      expect(event.data.expects_read_confirmation).toBe(expected);
    });

    it('ignores read receipt for which original message is not found', async () => {
      const event = createConfirmationEvent(3);
      const [readReceiptMiddleware, {eventService}] = buildReadReceiptMiddleware();

      await readReceiptMiddleware.processEvent(event);

      expect(eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [event.data.message_id]);
      expect(eventService.replaceEvent).not.toHaveBeenCalled();
    });

    it('ignores read receipt from user who already has read the message', async () => {
      const event = createConfirmationEvent(4);
      const [readReceiptMiddleware, {eventService, selfUser}] = buildReadReceiptMiddleware();

      const originalEvent = {from: selfUser.id, read_receipts: [{time: '', userId: event.from}]};
      eventService.loadEvents.mockResolvedValue([originalEvent]);

      await readReceiptMiddleware.processEvent(event);

      expect(eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [event.data.message_id]);
      expect(eventService.replaceEvent).not.toHaveBeenCalled();
    });

    it('ignores read receipts for messages that are not mine', async () => {
      const event = createConfirmationEvent(StatusType.SEEN);
      const [readReceiptMiddleware, {eventService}] = buildReadReceiptMiddleware();
      const originaleEvent = {from: createUuid()};
      eventService.loadEvents.mockResolvedValue([originaleEvent]);

      await readReceiptMiddleware.processEvent(event);

      expect(eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [event.data.message_id]);
      expect(eventService.replaceEvent).not.toHaveBeenCalled();
    });

    it('updates original message when read confirmation is received', async () => {
      const [readReceiptMiddleware, {eventService, selfUser}] = buildReadReceiptMiddleware();
      const originalEvent = {from: selfUser.id};

      eventService.loadEvents.mockResolvedValue([originalEvent]);
      eventService.replaceEvent.mockResolvedValue(originalEvent);

      const event = createConfirmationEvent(StatusType.SEEN, selfUser.id);

      await readReceiptMiddleware.processEvent(event);

      expect(eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [event.data.message_id]);
      expect(eventService.replaceEvent).toHaveBeenCalledWith({
        from: selfUser.id,
        read_receipts: [{time: event.time, userId: event.from}],
        status: event.data.status,
      });
    });

    it('updates original message when delivered confirmation is received', async () => {
      const [readReceiptMiddleware, {eventService, selfUser}] = buildReadReceiptMiddleware();
      const originalEvent = {from: selfUser.id};

      eventService.loadEvents.mockResolvedValue([originalEvent]);
      eventService.replaceEvent.mockResolvedValue(originalEvent);

      const event = createConfirmationEvent(StatusType.DELIVERED, selfUser.id);

      await readReceiptMiddleware.processEvent(event);

      expect(eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [event.data.message_id]);
      expect(eventService.replaceEvent).toHaveBeenCalledWith({
        from: selfUser.id,
        status: event.data.status,
      });
    });
  });
});

function createConfirmationEvent(status: StatusType, fromId = createUuid()): ConfirmationEvent {
  return {
    id: createUuid(),
    conversation: createUuid(),
    data: {
      message_id: createUuid(),
      more_message_ids: [],
      status,
    },
    from: fromId,
    time: '12-12-12',
    type: ClientEvent.CONVERSATION.CONFIRMATION,
  };
}
