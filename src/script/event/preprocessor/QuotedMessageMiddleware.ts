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

import {DeleteEvent, MessageAddEvent} from 'src/script/conversation/EventBuilder';
import {getLogger, Logger} from 'Util/Logger';
import {base64ToArray} from 'Util/util';

import {QuoteEntity} from '../../message/QuoteEntity';
import {EventRecord, StoredEvent} from '../../storage/record/EventRecord';
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

      case ClientEvent.CONVERSATION.MESSAGE_DELETE: {
        return this.handleDeleteEvent(event);
      }

      default: {
        return event;
      }
    }
  }

  private async handleDeleteEvent(event: DeleteEvent): Promise<DeleteEvent> {
    const originalMessageId = event.data.message_id;
    const {replies} = await this.findRepliesToMessage(event.conversation, originalMessageId);
    this.logger.info(`Invalidating '${replies.length}' replies to deleted message '${originalMessageId}'`);
    replies.forEach(reply => {
      reply.data.quote = {error: {type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND}};
      this.eventService.replaceEvent(reply);
    });
    return event;
  }

  private async handleEditEvent(event: MessageAddEvent, originalMessageId: string): Promise<MessageAddEvent> {
    const {originalEvent, replies} = await this.findRepliesToMessage(event.conversation, originalMessageId);
    if (!originalEvent) {
      return event;
    }

    this.logger.info(`Updating '${replies.length}' replies to updated message '${originalMessageId}'`);
    replies.forEach(reply => {
      (reply.data.quote as any).message_id = (event as any).id;
      // we want to update the messages quoting the original message later, thus the timeout
      setTimeout(() => this.eventService.replaceEvent(reply));
    });
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

    let quotedMessage =
      (await this.eventService.loadEvent(event.conversation, messageId)) ??
      (await this.eventService.loadReplacingEvent(event.conversation, messageId));
    if (!quotedMessage) {
      const replacedMessage = await this.eventService.loadReplacingEvent(event.conversation, messageId);
      if (!replacedMessage) {
        this.logger.warn(`Quoted message with ID "${messageId}" not found.`);
        const quoteData = {
          error: {
            type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND,
          },
        };

        const decoratedData = {...event.data, quote: quoteData};
        return {...event, data: decoratedData};
      }
      quotedMessage = replacedMessage;
    }

    const quoteData = {
      message_id: messageId,
      user_id: quotedMessage.from,
      hash: quote.quotedMessageSha256,
    };

    const decoratedData = {...event.data, quote: quoteData};
    return {...event, data: decoratedData};
  }

  private async findRepliesToMessage(
    conversationId: string,
    messageId: string,
  ): Promise<{originalEvent?: EventRecord; replies: StoredEvent<MessageAddEvent>[]}> {
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
