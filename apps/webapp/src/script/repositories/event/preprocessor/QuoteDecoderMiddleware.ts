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

import {Quote} from '@wireapp/protocol-messaging';

import {MessageAddEvent, MultipartMessageAddEvent, QuoteData} from 'Repositories/conversation/EventBuilder';
import {StoredEvent} from 'Repositories/storage/record/EventRecord';
import {getLogger, Logger} from 'Util/Logger';
import {base64ToArray} from 'Util/util';

import {QuoteEntity} from '../../../message/QuoteEntity';
import {ClientEvent} from '../Client';
import {EventMiddleware, IncomingEvent} from '../EventProcessor';
import type {EventService} from '../EventService';

type ProcessedQuoteData = Exclude<QuoteData, string>;

type QuoteAccessor<T> = {
  get: (event: T) => QuoteData | undefined;
  set: (event: T, quote: ProcessedQuoteData | undefined) => T;
};

const messageAddQuoteAccessor: QuoteAccessor<MessageAddEvent> = {
  get: event => event.data.quote,
  set: (event, quote) => ({
    ...event,
    data: {...event.data, quote},
  }),
};

const multipartMessageAddQuoteAccessor: QuoteAccessor<MultipartMessageAddEvent> = {
  get: event => event.data.text?.quote,
  set: (event, quote) => ({
    ...event,
    data: {
      ...event.data,
      text: {...event.data.text, quote},
    },
  }),
};

export class QuotedMessageMiddleware implements EventMiddleware {
  private readonly logger: Logger;

  constructor(private readonly eventService: EventService) {
    this.logger = getLogger('QuotedMessageMiddleware');
  }

  /**
   * Handles validation of the event if it contains a quote.
   * If the event does contain a quote, will also decorate the event with some metadata regarding the quoted message
   *
   * @param event event in the DB format
   * @returns the original event if no quote is found (or does not validate). The decorated event if the quote is valid
   */
  async processEvent(event: IncomingEvent): Promise<IncomingEvent> {
    switch (event.type) {
      case ClientEvent.CONVERSATION.MESSAGE_ADD: {
        const originalMessageId = event.data.replacing_message_id;
        return originalMessageId
          ? this.handleEditEvent(event, originalMessageId, messageAddQuoteAccessor)
          : this.handleAddEvent(event, messageAddQuoteAccessor);
      }
      case ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD: {
        const originalMessageId = event.data.replacing_message_id;
        return originalMessageId
          ? this.handleEditEvent(event, originalMessageId, multipartMessageAddQuoteAccessor)
          : this.handleAddEvent(event, multipartMessageAddQuoteAccessor);
      }
    }
    return event;
  }

  private async handleEditEvent<T extends MessageAddEvent | MultipartMessageAddEvent>(
    event: T,
    originalMessageId: string,
    accessor: QuoteAccessor<T>,
  ): Promise<T> {
    const originalEvent = (await this.eventService.loadEvent(event.conversation, originalMessageId)) as StoredEvent<
      MessageAddEvent | MultipartMessageAddEvent | undefined
    >;
    if (!originalEvent) {
      return event;
    }

    const originalQuote = this.extractQuoteFromOriginalEvent(originalEvent);
    return accessor.set(event, originalQuote);
  }

  private extractQuoteFromOriginalEvent(
    event: MessageAddEvent | MultipartMessageAddEvent,
  ): ProcessedQuoteData | undefined {
    if (event.type === ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD) {
      const quote = event.data.text?.quote;
      return typeof quote === 'string' ? undefined : quote;
    }
    const quote = event.data.quote;
    return typeof quote === 'string' ? undefined : quote;
  }

  private async handleAddEvent<T extends MessageAddEvent | MultipartMessageAddEvent>(
    event: T,
    accessor: QuoteAccessor<T>,
  ): Promise<T> {
    const rawQuote = accessor.get(event);

    if (!rawQuote || typeof rawQuote !== 'string') {
      return event;
    }

    let quote;
    try {
      const encodedQuote = base64ToArray(rawQuote);
      quote = Quote.decode(encodedQuote);
    } catch (error) {
      this.logger.warn('Failed to decode quoted message.', error);
      return event;
    }
    this.logger.info(`Found quoted message: ${quote.quotedMessageId}`);

    const messageId = quote.quotedMessageId;

    const quotedMessage = await this.eventService.loadEvent(event.conversation, messageId);
    if (!quotedMessage) {
      this.logger.warn(`Quoted message with ID "${messageId}" not found.`);
      const quoteData: ProcessedQuoteData = {
        error: {
          type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND,
        },
      };

      return accessor.set(event, quoteData);
    }

    const quoteData: ProcessedQuoteData = {
      message_id: messageId,
      user_id: quotedMessage.from,
      hash: quote.quotedMessageSha256,
    };

    return accessor.set(event, quoteData);
  }
}
