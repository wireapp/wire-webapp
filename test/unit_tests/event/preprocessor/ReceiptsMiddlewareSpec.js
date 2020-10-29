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

import {noop} from 'Util/util';
import {createRandomUuid} from 'Util/util';

import {ReceiptsMiddleware} from 'src/script/event/preprocessor/ReceiptsMiddleware';
import {ClientEvent} from 'src/script/event/Client';

describe('ReceiptsMiddleware', () => {
  const selfId = createRandomUuid();
  let readReceiptMiddleware;

  beforeEach(async () => {
    const eventService = {loadEvents: noop, replaceEvent: noop};
    readReceiptMiddleware = new ReceiptsMiddleware(eventService, undefined, {
      self: () => ({
        id: selfId,
      }),
    });
  });

  describe('processEvent', () => {
    it('ignores read receipt for which original message is not found', () => {
      const event = createConfirmationEvent(3);

      spyOn(readReceiptMiddleware.eventService, 'loadEvents').and.returnValue(Promise.resolve([]));
      spyOn(readReceiptMiddleware.eventService, 'replaceEvent');

      return readReceiptMiddleware.processEvent(event).then(() => {
        expect(readReceiptMiddleware.eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [
          event.data.message_id,
        ]);
        expect(readReceiptMiddleware.eventService.replaceEvent).not.toHaveBeenCalled();
      });
    });

    it('ignores read receipt from user who already has read the message', () => {
      const event = createConfirmationEvent(4);

      const originalEvent = {from: selfId, read_receipts: [{time: '', userId: event.from}]};
      spyOn(readReceiptMiddleware.eventService, 'loadEvents').and.returnValue(Promise.resolve([originalEvent]));
      spyOn(readReceiptMiddleware.eventService, 'replaceEvent');

      return readReceiptMiddleware.processEvent(event).then(() => {
        expect(readReceiptMiddleware.eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [
          event.data.message_id,
        ]);
        expect(readReceiptMiddleware.eventService.replaceEvent).not.toHaveBeenCalled();
      });
    });

    it('ignores read receipts for messages that are not mine', () => {
      const event = createConfirmationEvent(4);
      const originaleEvent = {from: createRandomUuid()};
      spyOn(readReceiptMiddleware.eventService, 'loadEvents').and.returnValue(Promise.resolve([originaleEvent]));
      spyOn(readReceiptMiddleware.eventService, 'replaceEvent');
      return readReceiptMiddleware.processEvent(event).then(() => {
        expect(readReceiptMiddleware.eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [
          event.data.message_id,
        ]);
        expect(readReceiptMiddleware.eventService.replaceEvent).not.toHaveBeenCalled();
      });
    });

    it('updates original message when read confirmation is received', () => {
      const originalEvent = {from: selfId};
      spyOn(readReceiptMiddleware.eventService, 'loadEvents').and.returnValue(Promise.resolve([originalEvent]));
      spyOn(readReceiptMiddleware.eventService, 'replaceEvent').and.returnValue(Promise.resolve(originalEvent));

      const event = createConfirmationEvent(4, [], selfId);

      return readReceiptMiddleware.processEvent(event).then(() => {
        expect(readReceiptMiddleware.eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [
          event.data.message_id,
        ]);
        expect(readReceiptMiddleware.eventService.replaceEvent).toHaveBeenCalledWith({
          from: selfId,
          read_receipts: [{time: event.time, userId: event.from}],
          status: event.data.status,
        });
      });
    });

    it('updates original message when delivered confirmation is received', () => {
      const originalEvent = {from: selfId};
      spyOn(readReceiptMiddleware.eventService, 'loadEvents').and.returnValue(Promise.resolve([originalEvent]));
      spyOn(readReceiptMiddleware.eventService, 'replaceEvent').and.returnValue(Promise.resolve(originalEvent));

      const event = createConfirmationEvent(3, [], selfId);

      return readReceiptMiddleware.processEvent(event).then(() => {
        expect(readReceiptMiddleware.eventService.loadEvents).toHaveBeenCalledWith(event.conversation, [
          event.data.message_id,
        ]);
        expect(readReceiptMiddleware.eventService.replaceEvent).toHaveBeenCalledWith({
          from: selfId,
          status: event.data.status,
        });
      });
    });
  });
});

function createConfirmationEvent(status, moreMessageIds = [], fromId = createRandomUuid()) {
  return {
    conversation: createRandomUuid(),
    data: {
      message_id: createRandomUuid(),
      more_message_ids: moreMessageIds,
      status,
    },
    from: fromId,
    time: '12-12-12',
    type: ClientEvent.CONVERSATION.CONFIRMATION,
  };
}
