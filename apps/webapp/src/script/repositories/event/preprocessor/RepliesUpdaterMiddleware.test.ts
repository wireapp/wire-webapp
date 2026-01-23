/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {QuoteEntity} from 'src/script/message/QuoteEntity';
import {createMessageAddEvent, createMultipartMessageAddEvent, toSavedEvent} from 'test/helper/EventGenerator';
import {createUuid} from 'Util/uuid';

import {RepliesUpdaterMiddleware} from './RepliesUpdaterMiddleware';

import {ClientEvent} from '../Client';
import {EventService} from '../EventService';

function buildRepliesUpdaterMiddleware() {
  const eventService = {
    loadEvent: jest.fn(() => []),
    loadEventsReplyingToMessage: jest.fn(),
    loadReplacingEvent: jest.fn(),
    replaceEvent: jest.fn(),
  } as unknown as jest.Mocked<EventService>;

  return [new RepliesUpdaterMiddleware(eventService), {eventService}] as const;
}

describe('QuotedMessageMiddleware', () => {
  const conversation = new Conversation(createUuid());
  conversation.selfUser(new User());

  describe('processEvent', () => {
    it('updates quotes in DB when a message is edited', async () => {
      const [repliesUpdaterMiddleware, {eventService}] = buildRepliesUpdaterMiddleware();
      const originalMessage = toSavedEvent(createMessageAddEvent());
      const replies = [
        createMessageAddEvent({dataOverrides: {quote: {message_id: originalMessage.id} as any}}),
        createMessageAddEvent({dataOverrides: {quote: {message_id: originalMessage.id} as any}}),
      ];
      eventService.loadEvent.mockResolvedValue(originalMessage);
      eventService.loadEventsReplyingToMessage.mockResolvedValue(replies);

      const event = createMessageAddEvent({dataOverrides: {replacing_message_id: originalMessage.id}});

      jest.useFakeTimers();

      await repliesUpdaterMiddleware.processEvent(event);
      jest.advanceTimersByTime(1);

      expect(eventService.replaceEvent).toHaveBeenCalledWith(
        jasmine.objectContaining({data: jasmine.objectContaining({quote: {message_id: event.id}})}),
      );
      jest.useRealTimers();
    });

    it('invalidates quotes in DB when a message is deleted', () => {
      const [repliesUpdaterMiddleware, {eventService}] = buildRepliesUpdaterMiddleware();
      const originalMessage = toSavedEvent(createMessageAddEvent());
      const replies = [
        createMessageAddEvent({dataOverrides: {quote: {message_id: originalMessage.id} as any}}),
        createMessageAddEvent({dataOverrides: {quote: {message_id: originalMessage.id} as any}}),
      ];
      spyOn(eventService, 'loadEvent').and.returnValue(Promise.resolve(originalMessage));
      spyOn(eventService, 'loadEventsReplyingToMessage').and.returnValue(Promise.resolve(replies));
      spyOn(eventService, 'replaceEvent').and.returnValue(Promise.resolve());

      const event = {
        conversation: 'conversation-uuid',
        data: {
          replacing_message_id: 'original-id',
        },
        id: 'new-id',
        type: ClientEvent.CONVERSATION.MESSAGE_DELETE,
      } as any;

      return repliesUpdaterMiddleware.processEvent(event).then(() => {
        expect(eventService.replaceEvent).toHaveBeenCalledWith(
          jasmine.objectContaining({
            data: jasmine.objectContaining({quote: {error: {type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND}}}),
          }),
        );
      });
    });

    it('updates quotes in DB when a multipart message is edited', async () => {
      const [repliesUpdaterMiddleware, {eventService}] = buildRepliesUpdaterMiddleware();
      const originalMessage = toSavedEvent(createMultipartMessageAddEvent());
      const replies = [
        createMultipartMessageAddEvent({
          dataOverrides: {text: {content: '', quote: {message_id: originalMessage.id} as any}},
        }),
        createMultipartMessageAddEvent({
          dataOverrides: {text: {content: '', quote: {message_id: originalMessage.id} as any}},
        }),
      ];
      eventService.loadEvent.mockResolvedValue(originalMessage);
      eventService.loadEventsReplyingToMessage.mockResolvedValue(replies);

      const event = createMultipartMessageAddEvent({
        dataOverrides: {replacing_message_id: originalMessage.id},
      });

      jest.useFakeTimers();

      await repliesUpdaterMiddleware.processEvent(event);
      jest.advanceTimersByTime(1);

      expect(eventService.replaceEvent).toHaveBeenCalledWith(
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            text: jasmine.objectContaining({quote: {message_id: event.id}}),
          }),
        }),
      );
      jest.useRealTimers();
    });

    it('invalidates quotes in DB when a multipart message is deleted', () => {
      const [repliesUpdaterMiddleware, {eventService}] = buildRepliesUpdaterMiddleware();
      const originalMessage = toSavedEvent(createMultipartMessageAddEvent());
      const replies = [
        createMultipartMessageAddEvent({
          dataOverrides: {text: {content: '', quote: {message_id: originalMessage.id} as any}},
        }),
        createMultipartMessageAddEvent({
          dataOverrides: {text: {content: '', quote: {message_id: originalMessage.id} as any}},
        }),
      ];
      spyOn(eventService, 'loadEvent').and.returnValue(Promise.resolve(originalMessage));
      spyOn(eventService, 'loadEventsReplyingToMessage').and.returnValue(Promise.resolve(replies));
      spyOn(eventService, 'replaceEvent').and.returnValue(Promise.resolve());

      const event = {
        conversation: 'conversation-uuid',
        data: {
          replacing_message_id: 'original-id',
        },
        id: 'new-id',
        type: ClientEvent.CONVERSATION.MESSAGE_DELETE,
      } as any;

      return repliesUpdaterMiddleware.processEvent(event).then(() => {
        expect(eventService.replaceEvent).toHaveBeenCalledWith(
          jasmine.objectContaining({
            data: jasmine.objectContaining({
              text: jasmine.objectContaining({
                quote: {error: {type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND}},
              }),
            }),
          }),
        );
      });
    });

    it('updates multipart quotes when replying to a regular message that is edited', async () => {
      const [repliesUpdaterMiddleware, {eventService}] = buildRepliesUpdaterMiddleware();
      const originalMessage = toSavedEvent(createMessageAddEvent());
      const multipartReply = createMultipartMessageAddEvent({
        dataOverrides: {text: {content: '', quote: {message_id: originalMessage.id} as any}},
      });
      const regularReply = createMessageAddEvent({
        dataOverrides: {quote: {message_id: originalMessage.id} as any},
      });
      eventService.loadEvent.mockResolvedValue(originalMessage);
      eventService.loadEventsReplyingToMessage.mockResolvedValue([multipartReply, regularReply]);

      const event = createMessageAddEvent({dataOverrides: {replacing_message_id: originalMessage.id}});

      jest.useFakeTimers();

      await repliesUpdaterMiddleware.processEvent(event);
      jest.advanceTimersByTime(1);

      // Verify both multipart and regular replies are updated
      expect(eventService.replaceEvent).toHaveBeenCalledWith(
        jasmine.objectContaining({
          data: jasmine.objectContaining({
            text: jasmine.objectContaining({quote: {message_id: event.id}}),
          }),
        }),
      );
      expect(eventService.replaceEvent).toHaveBeenCalledWith(
        jasmine.objectContaining({data: jasmine.objectContaining({quote: {message_id: event.id}})}),
      );
      jest.useRealTimers();
    });
  });
});
