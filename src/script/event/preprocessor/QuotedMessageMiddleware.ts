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

import {getLogger, Logger} from 'Util/Logger';
import {base64ToArray} from 'Util/util';

import {ClientEvent} from '../Client';
import {QuoteEntity} from '../../message/QuoteEntity';
import {MessageHasher} from '../../message/MessageHasher';
import type {EventService} from '../EventService';
import {EventRecord} from '../../storage/EventRecord';

export class QuotedMessageMiddleware {
  private readonly eventService: EventService;
  private readonly logger: Logger;

  constructor(eventService: EventService) {
    this.eventService = eventService;
    this.logger = getLogger('QuotedMessageMiddleware');
  }

  /**
   * Handles validation of the event if it contains a quote.
   * If the event does contain a quote, will also decorate the event with some metadata regarding the quoted message
   *
   * @param event event in the DB format
   * @returns the original event if no quote is found (or does not validate). The decorated event if the quote is valid
   */
  processEvent(event: EventRecord): Promise<EventRecord> {
    switch (event.type) {
      case ClientEvent.CONVERSATION.MESSAGE_ADD:
        if (event.data.replacing_message_id) {
          return this._handleEditEvent(event);
        }
        return this._handleAddEvent(event);

      case ClientEvent.CONVERSATION.MESSAGE_DELETE:
        return this._handleDeleteEvent(event);

      default:
        return Promise.resolve(event);
    }
  }

  private async _handleDeleteEvent(event: EventRecord): Promise<EventRecord> {
    const originalMessageId = event.data.message_id;
    const {replies} = await this._findRepliesToMessage(event.conversation, originalMessageId);
    this.logger.info(`Invalidating '${replies.length}' replies to deleted message '${originalMessageId}'`);
    replies.forEach(reply => {
      reply.data.quote = {error: {type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND}};
      this.eventService.replaceEvent(reply);
    });
    return event;
  }

  private async _handleEditEvent(event: EventRecord): Promise<EventRecord> {
    const originalMessageId = event.data.replacing_message_id;
    const {originalEvent, replies} = await this._findRepliesToMessage(event.conversation, originalMessageId);
    if (!originalEvent) {
      return event;
    }

    this.logger.info(`Updating '${replies.length}' replies to updated message '${originalMessageId}'`);
    replies.forEach(reply => {
      reply.data.quote.message_id = event.id;
      // we want to update the messages quoting the original message later, thus the timeout
      setTimeout(() => this.eventService.replaceEvent(reply));
    });
    const decoratedData = {...event.data, quote: originalEvent.data.quote};
    return {...event, data: decoratedData};
  }

  private async _handleAddEvent(event: EventRecord): Promise<EventRecord> {
    const rawQuote = event.data && event.data.quote;

    if (!rawQuote) {
      return event;
    }

    const encodedQuote = await base64ToArray(rawQuote);
    const quote = Quote.decode(encodedQuote);
    this.logger.info('Found quoted message', quote);

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

    const quotedMessageHash = new Uint8Array(quote.quotedMessageSha256).buffer;

    const isValid = await MessageHasher.validateHash(quotedMessage, quotedMessageHash);
    let quoteData;

    if (!isValid) {
      this.logger.warn(`Quoted message hash for message ID "${messageId}" does not match.`);
      quoteData = {
        error: {
          type: QuoteEntity.ERROR.INVALID_HASH,
        },
      };
    } else {
      quoteData = {
        message_id: messageId,
        user_id: quotedMessage.from,
      };
    }

    const decoratedData = {...event.data, quote: quoteData};
    return {...event, data: decoratedData};
  }

  private async _findRepliesToMessage(
    conversationId: string,
    messageId: string,
  ): Promise<{originalEvent?: EventRecord; replies: EventRecord[]}> {
    const originalEvent = await this.eventService.loadEvent(conversationId, messageId);

    if (!originalEvent) {
      return {
        replies: [],
      };
    }

    const replies = await this.eventService.loadEventsReplyingToMessage(conversationId, messageId, originalEvent.time);

    return {
      originalEvent,
      replies,
    };
  }
}
