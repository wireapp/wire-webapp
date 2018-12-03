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

// KARMA_SPECS=event/preprocessor/QuotedMessageMiddleware yarn test:app

import ReadReceiptMiddleware from 'app/script/event/preprocessor/ReadReceiptMiddleware';

describe('ReadReceiptMiddleware', () => {
  const noop = () => {};
  let readReceiptMiddleware;
  const eventService = {loadEvent: noop, replaceEvent: noop};

  beforeEach(() => {
    readReceiptMiddleware = new ReadReceiptMiddleware(eventService);
  });

  describe('processEvent', () => {
    it('ignores read receipt for which original message is not found', () => {
      spyOn(eventService, 'loadEvent').and.returnValue(Promise.resolve(undefined));
      spyOn(eventService, 'replaceEvent');

      const event = {
        conversation: 'conversattionid',
        data: {
          message_id: 'messageid',
        },
        type: z.event.Client.CONVERSATION.CONFIRMATION,
      };

      return readReceiptMiddleware.processEvent(event).then(decoratedEvent => {
        expect(eventService.loadEvent).toHaveBeenCalledWith(event.conversation, event.data.message_id);
        expect(eventService.replaceEvent).not.toHaveBeenCalled();
      });
    });

    it('updates original message when read confirmation is received', () => {
      const originalEvent = {};
      spyOn(eventService, 'loadEvent').and.returnValue(Promise.resolve(originalEvent));
      spyOn(eventService, 'replaceEvent').and.returnValue(Promise.resolve(originalEvent));

      const event = {
        conversation: 'conversattionid',
        data: {
          message_id: 'messageid',
        },
        from: 'userid',
        time: '12-12-12',
        type: z.event.Client.CONVERSATION.CONFIRMATION,
      };

      return readReceiptMiddleware.processEvent(event).then(decoratedEvent => {
        expect(eventService.loadEvent).toHaveBeenCalledWith(event.conversation, event.data.message_id);
        expect(eventService.replaceEvent).toHaveBeenCalledWith({
          readReceipts: [{time: event.time, userId: event.from}],
        });
      });
    });
  });
});
