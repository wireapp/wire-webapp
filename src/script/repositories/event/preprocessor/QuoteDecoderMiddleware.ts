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

import {MessageAddEvent, MultipartMessageAddEvent} from 'Repositories/conversation/EventBuilder';
import {StoredEvent} from 'Repositories/storage/record/EventRecord';
import {getLogger, Logger} from 'Util/Logger';
import {base64ToArray} from 'Util/util';

import {QuoteEntity} from '../../../message/QuoteEntity';
import {ClientEvent} from '../Client';
import {EventMiddleware, IncomingEvent} from '../EventProcessor';
import type {EventService} from '../EventService';

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
        return originalMessageId ? this.handleEditEvent(event, originalMessageId) : this.handleAddEvent(event);
      }
      case ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD: {
        const originalMessageId = event.data.replacing_message_id;
        return originalMessageId
          ? this.handleMultipartEditEvent(event, originalMessageId)
          : this.handleMultipartAddEvent(event);
      }
    }
    return event;
  }

  private async handleEditEvent(event: MessageAddEvent, originalMessageId: string): Promise<MessageAddEvent> {
    const originalEvent = (await this.eventService.loadEvent(event.conversation, originalMessageId)) as StoredEvent<
      MessageAddEvent | undefined
    >;
    if (!originalEvent) {
      return event;
    }

    const decoratedData = {...event.data, quote: originalEvent.data.quote};
    return {...event, data: decoratedData};
  }

  private async handleAddEvent(event: MessageAddEvent): Promise<MessageAddEvent> {
    const rawQuote = event.data.quote;

    if (!rawQuote || typeof rawQuote !== 'string') {
      return event;
    }

    const encodedQuote = base64ToArray(rawQuote);
    const quote = Quote.decode(encodedQuote);
    this.logger.info(`Found quoted message: ${quote.quotedMessageId}`);

    const messageId = quote.quotedMessageId;

    const quotedMessage = await this.eventService.loadEvent(event.conversation, messageId);
    if (!quotedMessage) {
      this.logger.warn(`Quoted message with ID "${messageId}" not found.`);
      const quoteData = {
        error: {
          type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND,
        },
      };

      const decoratedData = {...event.data, quote: quoteData};
      return {...event, data: decoratedData};
    }

    const quoteData = {
      message_id: messageId,
      user_id: quotedMessage.from,
      hash: quote.quotedMessageSha256,
    };

    const decoratedData = {...event.data, quote: quoteData};
    return {...event, data: decoratedData};
  }

  private async handleMultipartEditEvent(
    event: MultipartMessageAddEvent,
    originalMessageId: string,
  ): Promise<MultipartMessageAddEvent> {
    const originalEvent = (await this.eventService.loadEvent(event.conversation, originalMessageId)) as StoredEvent<
      MessageAddEvent | MultipartMessageAddEvent | undefined
    >;
    if (!originalEvent) {
      return event;
    }

    const originalQuote =
      originalEvent.type === ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD
        ? originalEvent.data.text.quote
        : originalEvent.data.quote;

    const decoratedData = {...event.data, text: {...event.data.text, quote: originalQuote} as any};
    return {...event, data: decoratedData};
  }

  private async handleMultipartAddEvent(event: MultipartMessageAddEvent): Promise<MultipartMessageAddEvent> {
    const rawQuote = event.data.text.quote;

    if (!rawQuote || typeof rawQuote !== 'string') {
      return event;
    }

    const encodedQuote = base64ToArray(rawQuote);
    const quote = Quote.decode(encodedQuote);
    this.logger.info(`Found quoted message in multipart: ${quote.quotedMessageId}`);

    const messageId = quote.quotedMessageId;

    const quotedMessage = await this.eventService.loadEvent(event.conversation, messageId);
    if (!quotedMessage) {
      this.logger.warn(`Quoted message with ID "${messageId}" not found.`);
      const quoteData = {
        error: {
          type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND,
        },
      };

      const decoratedData = {...event.data, text: {...event.data.text, quote: quoteData} as any};
      return {...event, data: decoratedData};
    }

    const quoteData = {
      message_id: messageId,
      user_id: quotedMessage.from,
      hash: quote.quotedMessageSha256,
    };

    const decoratedData = {...event.data, text: {...event.data.text, quote: quoteData} as any};
    return {...event, data: decoratedData};
  }
}
