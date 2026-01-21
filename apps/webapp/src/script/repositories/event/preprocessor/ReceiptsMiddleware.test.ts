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

import {ConfirmationEvent} from 'Repositories/conversation/EventBuilder';
import {User} from 'Repositories/entity/User';
import {StatusType} from 'src/script/message/StatusType';
import {createUuid} from 'Util/uuid';

import {ReceiptsMiddleware} from './ReceiptsMiddleware';

import {ClientEvent} from '../Client';

function buildReadReceiptMiddleware() {
  const selfUser = new User(createUuid());
  const eventService = {loadEvents: jest.fn(() => []), replaceEvent: jest.fn()} as any;

  return [new ReceiptsMiddleware(eventService, {} as any, selfUser), {eventService, selfUser}] as const;
}

describe('ReceiptsMiddleware', () => {
  describe('processEvent', () => {
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
