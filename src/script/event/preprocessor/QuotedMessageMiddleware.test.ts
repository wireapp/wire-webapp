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

import {Quote} from '@wireapp/protocol-messaging';

import {Conversation} from 'src/script/entity/Conversation';
import {User} from 'src/script/entity/User';
import {ClientEvent} from 'src/script/event/Client';
import {MessageHasher} from 'src/script/message/MessageHasher';
import {QuoteEntity} from 'src/script/message/QuoteEntity';
import {createMessageAddEvent, toSavedEvent} from 'test/helper/EventGenerator';
import {arrayToBase64} from 'Util/util';
import {createUuid} from 'Util/uuid';

import {QuotedMessageMiddleware} from './QuotedMessageMiddleware';

import {EventService} from '../EventService';

function buildQuotedMessageMiddleware() {
  const eventService = {
    loadEvent: jest.fn(() => []),
    loadEventsReplyingToMessage: jest.fn(),
    loadReplacingEvent: jest.fn(),
    replaceEvent: jest.fn(),
  } as unknown as jest.Mocked<EventService>;

  return [new QuotedMessageMiddleware(eventService), {eventService}] as const;
}

describe('QuotedMessageMiddleware', () => {
  const conversation = new Conversation(createUuid());
  conversation.selfUser(new User());

  describe('processEvent', () => {
    it('ignores messages that do not have quotes', async () => {
      const [quotedMessageMiddleware] = buildQuotedMessageMiddleware();
      const event = createMessageAddEvent();

      const decoratedEvent = await quotedMessageMiddleware.processEvent(event);
      expect(decoratedEvent).toEqual(event);
    });

    it('adds an error if quoted message is not found', async () => {
      const [quotedMessageMiddleware, {eventService}] = buildQuotedMessageMiddleware();
      eventService.loadEvent.mockResolvedValue(undefined);

      const expectedError = {
        type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND,
      };

      const quote = new Quote({
        quotedMessageId: 'invalid-message-uuid',
        quotedMessageSha256: new Uint8Array(),
      });

      const base64Quote = arrayToBase64(Quote.encode(quote).finish());

      const event = createMessageAddEvent();
      event.data.quote = base64Quote;

      const parsedEvent: any = await quotedMessageMiddleware.processEvent(event);

      expect(parsedEvent.data.quote.quotedMessageId).toBeUndefined();
      expect(parsedEvent.data.quote.error).toEqual(expectedError);
    });

    it('decorates event with the quote metadata if validation is successful', async () => {
      const [quotedMessageMiddleware, {eventService}] = buildQuotedMessageMiddleware();
      const quotedMessage = createMessageAddEvent();
      jest.spyOn(MessageHasher, 'validateHash').mockResolvedValue(true);
      eventService.loadEvent.mockResolvedValue(toSavedEvent(quotedMessage));

      const quote = new Quote({
        quotedMessageId: quotedMessage.id,
        quotedMessageSha256: new Uint8Array(),
      });

      const base64Quote = arrayToBase64(Quote.encode(quote).finish());

      const event = createMessageAddEvent();
      event.data.quote = base64Quote;

      const parsedEvent: any = await quotedMessageMiddleware.processEvent(event);

      expect(parsedEvent.data.quote.message_id).toEqual(quotedMessage.id);
      expect(parsedEvent.data.quote.user_id).toEqual(quotedMessage.from);
    });

    it('updates quotes in DB when a message is edited', async () => {
      const [quotedMessageMiddleware, {eventService}] = buildQuotedMessageMiddleware();
      const originalMessage = toSavedEvent(createMessageAddEvent());
      const replies = [
        createMessageAddEvent({dataOverrides: {quote: {message_id: originalMessage.id} as any}}),
        createMessageAddEvent({dataOverrides: {quote: {message_id: originalMessage.id} as any}}),
      ];
      eventService.loadEvent.mockResolvedValue(originalMessage);
      eventService.loadEventsReplyingToMessage.mockResolvedValue(replies);

      const event = createMessageAddEvent({dataOverrides: {replacing_message_id: originalMessage.id}});

      jest.useFakeTimers();

      await quotedMessageMiddleware.processEvent(event);
      jest.advanceTimersByTime(1);

      expect(eventService.replaceEvent).toHaveBeenCalledWith(
        jasmine.objectContaining({data: jasmine.objectContaining({quote: {message_id: event.id}})}),
      );
      jest.useRealTimers();
    });

    it('invalidates quotes in DB when a message is deleted', () => {
      const [quotedMessageMiddleware, {eventService}] = buildQuotedMessageMiddleware();
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

      return quotedMessageMiddleware.processEvent(event).then(() => {
        expect(eventService.replaceEvent).toHaveBeenCalledWith(
          jasmine.objectContaining({
            data: jasmine.objectContaining({quote: {error: {type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND}}}),
          }),
        );
      });
    });
  });
});
