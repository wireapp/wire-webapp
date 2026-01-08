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

import {Conversation} from 'Repositories/entity/Conversation';
import {User} from 'Repositories/entity/User';
import {MessageHasher} from 'src/script/message/MessageHasher';
import {QuoteEntity} from 'src/script/message/QuoteEntity';
import {createMessageAddEvent, createMultipartMessageAddEvent, toSavedEvent} from 'test/helper/EventGenerator';
import {arrayToBase64} from 'Util/util';
import {createUuid} from 'Util/uuid';

import {QuotedMessageMiddleware} from './QuoteDecoderMiddleware';

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
  });

  describe('multipart message handling', () => {
    describe('handleMultipartAddEvent', () => {
      it('ignores multipart messages that do not have quotes', async () => {
        const [quotedMessageMiddleware] = buildQuotedMessageMiddleware();
        const event = createMultipartMessageAddEvent();

        const decoratedEvent = await quotedMessageMiddleware.processEvent(event);
        expect(decoratedEvent).toEqual(event);
      });

      it('adds an error if quoted message is not found in multipart message', async () => {
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

        const event = createMultipartMessageAddEvent();
        event.data.text.quote = base64Quote;

        const parsedEvent: any = await quotedMessageMiddleware.processEvent(event);

        expect(parsedEvent.data.text.quote.quotedMessageId).toBeUndefined();
        expect(parsedEvent.data.text.quote.error).toEqual(expectedError);
      });

      it('decorates multipart event with quote metadata if validation is successful', async () => {
        const [quotedMessageMiddleware, {eventService}] = buildQuotedMessageMiddleware();
        const quotedMessage = createMessageAddEvent();
        jest.spyOn(MessageHasher, 'validateHash').mockResolvedValue(true);
        eventService.loadEvent.mockResolvedValue(toSavedEvent(quotedMessage));

        const quote = new Quote({
          quotedMessageId: quotedMessage.id,
          quotedMessageSha256: new Uint8Array(),
        });

        const base64Quote = arrayToBase64(Quote.encode(quote).finish());

        const event = createMultipartMessageAddEvent();
        event.data.text.quote = base64Quote;

        const parsedEvent: any = await quotedMessageMiddleware.processEvent(event);

        expect(parsedEvent.data.text.quote.message_id).toEqual(quotedMessage.id);
        expect(parsedEvent.data.text.quote.user_id).toEqual(quotedMessage.from);
        expect(parsedEvent.data.text.quote.hash).toBeDefined();
      });

      it('handles quotes with hash data correctly', async () => {
        const [quotedMessageMiddleware, {eventService}] = buildQuotedMessageMiddleware();
        const quotedMessage = createMessageAddEvent();
        const hashArray = new Uint8Array([1, 2, 3, 4, 5]);

        eventService.loadEvent.mockResolvedValue(toSavedEvent(quotedMessage));

        const quote = new Quote({
          quotedMessageId: quotedMessage.id,
          quotedMessageSha256: hashArray,
        });

        const base64Quote = arrayToBase64(Quote.encode(quote).finish());

        const event = createMultipartMessageAddEvent();
        event.data.text.quote = base64Quote;

        const parsedEvent: any = await quotedMessageMiddleware.processEvent(event);

        expect(parsedEvent.data.text.quote.hash).toEqual(hashArray);
      });
    });

    describe('handleMultipartEditEvent', () => {
      it('preserves quote from original multipart message when editing', async () => {
        const [quotedMessageMiddleware, {eventService}] = buildQuotedMessageMiddleware();

        const quotedMessage = createMessageAddEvent();
        const originalQuoteData = {
          message_id: quotedMessage.id,
          user_id: quotedMessage.from,
          hash: new Uint8Array([1, 2, 3]),
        };

        const originalMessage = createMultipartMessageAddEvent();
        originalMessage.data.text.quote = originalQuoteData;

        eventService.loadEvent.mockResolvedValue(toSavedEvent(originalMessage));

        const editEvent = createMultipartMessageAddEvent({
          dataOverrides: {
            replacing_message_id: originalMessage.id,
          },
        });

        const parsedEvent: any = await quotedMessageMiddleware.processEvent(editEvent);

        expect(parsedEvent.data.text.quote).toEqual(originalQuoteData);
      });

      it('preserves quote from original non-multipart message when editing as multipart', async () => {
        const [quotedMessageMiddleware, {eventService}] = buildQuotedMessageMiddleware();

        const quotedMessage = createMessageAddEvent();
        const originalQuoteData = {
          message_id: quotedMessage.id,
          user_id: quotedMessage.from,
          hash: new Uint8Array([1, 2, 3]),
        };

        const originalMessage = createMessageAddEvent();
        originalMessage.data.quote = originalQuoteData;

        eventService.loadEvent.mockResolvedValue(toSavedEvent(originalMessage));

        const editEvent = createMultipartMessageAddEvent({
          dataOverrides: {
            replacing_message_id: originalMessage.id,
          },
        });

        const parsedEvent: any = await quotedMessageMiddleware.processEvent(editEvent);

        expect(parsedEvent.data.text.quote).toEqual(originalQuoteData);
      });

      it('returns original event if original message is not found during edit', async () => {
        const [quotedMessageMiddleware, {eventService}] = buildQuotedMessageMiddleware();
        eventService.loadEvent.mockResolvedValue(undefined);

        const editEvent = createMultipartMessageAddEvent({
          dataOverrides: {
            replacing_message_id: 'non-existent-id',
          },
        });

        const parsedEvent = await quotedMessageMiddleware.processEvent(editEvent);

        expect(parsedEvent).toEqual(editEvent);
      });

      it('handles edit event with error quote from original message', async () => {
        const [quotedMessageMiddleware, {eventService}] = buildQuotedMessageMiddleware();

        const originalQuoteData = {
          error: {
            type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND,
          },
        };

        const originalMessage = createMultipartMessageAddEvent();
        originalMessage.data.text.quote = originalQuoteData;

        eventService.loadEvent.mockResolvedValue(toSavedEvent(originalMessage));

        const editEvent = createMultipartMessageAddEvent({
          dataOverrides: {
            replacing_message_id: originalMessage.id,
          },
        });

        const parsedEvent: any = await quotedMessageMiddleware.processEvent(editEvent);

        expect(parsedEvent.data.text.quote).toEqual(originalQuoteData);
      });
    });
  });
});
