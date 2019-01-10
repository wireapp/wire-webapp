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

// KARMA_SPECS=event/preprocessor/ReceiptsMiddleware yarn test:app

import UUID from 'uuidjs';
import ReceiptsMiddleware from 'src/script/event/preprocessor/ReceiptsMiddleware';

describe('ReceiptsMiddleware', () => {
  const noop = () => {};
  const selfId = UUID.genV4();
  let readReceiptMiddleware;
  const eventService = {loadEvents: noop, replaceEvent: noop};
  const userRepository = {
    self: () => ({
      id: selfId,
    }),
  };

  beforeEach(() => {
    readReceiptMiddleware = new ReceiptsMiddleware(eventService, userRepository);
  });

  describe('processEvent', () => {
    it('ignores read receipt for which original message is not found', () => {
      const event = createConfirmationEvent(3);

      spyOn(eventService, 'loadEvents').and.returnValue(Promise.resolve([]));
      spyOn(eventService, 'replaceEvent');

      return readReceiptMiddleware.processEvent(event).then(decoratedEvent => {
        expect(eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [event.data.message_id]);
        expect(eventService.replaceEvent).not.toHaveBeenCalled();
      });
    });

    it('ignores read receipt from user who already has read the message', () => {
      const event = createConfirmationEvent(4);

      const originalEvent = {from: selfId, read_receipts: [{time: '', userId: event.from}]};
      spyOn(eventService, 'loadEvents').and.returnValue(Promise.resolve([originalEvent]));
      spyOn(eventService, 'replaceEvent');

      return readReceiptMiddleware.processEvent(event).then(decoratedEvent => {
        expect(eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [event.data.message_id]);
        expect(eventService.replaceEvent).not.toHaveBeenCalled();
      });
    });

    it('ignores read receipts for messages that are not mine', () => {
      const event = createConfirmationEvent(4);
      const originaleEvent = {from: UUID.genV4()};
      spyOn(eventService, 'loadEvents').and.returnValue(Promise.resolve([originaleEvent]));
      spyOn(eventService, 'replaceEvent');
      return readReceiptMiddleware.processEvent(event).then(decoratedEvent => {
        expect(eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [event.data.message_id]);
        expect(eventService.replaceEvent).not.toHaveBeenCalled();
      });
    });

    it('updates original message when read confirmation is received', () => {
      const originalEvent = {from: selfId};
      spyOn(eventService, 'loadEvents').and.returnValue(Promise.resolve([originalEvent]));
      spyOn(eventService, 'replaceEvent').and.returnValue(Promise.resolve(originalEvent));

      const event = createConfirmationEvent(4);

      return readReceiptMiddleware.processEvent(event).then(decoratedEvent => {
        expect(eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [event.data.message_id]);
        expect(eventService.replaceEvent).toHaveBeenCalledWith({
          from: selfId,
          read_receipts: [{time: event.time, userId: event.from}],
          status: event.data.status,
        });
      });
    });

    it('updates original message when delivered confirmation is received', () => {
      const originalEvent = {from: selfId};
      spyOn(eventService, 'loadEvents').and.returnValue(Promise.resolve([originalEvent]));
      spyOn(eventService, 'replaceEvent').and.returnValue(Promise.resolve(originalEvent));

      const event = createConfirmationEvent(3);

      return readReceiptMiddleware.processEvent(event).then(decoratedEvent => {
        expect(eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [event.data.message_id]);
        expect(eventService.replaceEvent).toHaveBeenCalledWith({
          from: selfId,
          status: event.data.status,
        });
      });
    });
  });
});

function createConfirmationEvent(status, moreMessageIds = []) {
  return {
    conversation: UUID.genV4(),
    data: {
      message_id: UUID.genV4(),
      more_message_ids: moreMessageIds,
      status,
    },
    from: UUID.genV4(),
    time: '12-12-12',
    type: z.event.Client.CONVERSATION.CONFIRMATION,
  };
}
