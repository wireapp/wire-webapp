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

import {getLogger} from 'Util/Logger';
import {base64ToArraySync} from 'Util/util';

import {ClientEvent} from '../Client';
import {QuoteEntity} from '../../message/QuoteEntity';
import {MessageHasher} from '../../message/MessageHasher';

export class QuotedMessageMiddleware {
  /**
   * Construct a new QuotedMessageMiddleware.
   * This class is reponsible for parsing incoming text messages that contains quoted messages.
   * It will handle validating the quote and adding metadata to the event.
   *
   * @param {EventService} eventService - Repository that handles events
   */
  constructor(eventService) {
    this.eventService = eventService;
    this.logger = getLogger('QuotedMessageMiddleware');
  }

  /**
   * Handles validation of the event if it contains a quote.
   * If the event does contain a quote, will also decorate the event with some metadata regarding the quoted message
   *
   * @param {Object} event - event in the DB format
   * @returns {Object} event - the original event if no quote is found (or does not validate). The decorated event if the quote is valid
   */
  processEvent(event) {
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

  _handleDeleteEvent(event) {
    const originalMessageId = event.data.message_id;
    return this._findRepliesToMessage(event.conversation, originalMessageId).then(({replies}) => {
      this.logger.info(`Invalidating '${replies.length}' replies to deleted message '${originalMessageId}'`);
      replies.forEach(reply => {
        reply.data.quote = {error: {type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND}};
        this.eventService.replaceEvent(reply);
      });
      return event;
    });
  }

  _handleEditEvent(event) {
    const originalMessageId = event.data.replacing_message_id;
    return this._findRepliesToMessage(event.conversation, originalMessageId).then(({originalEvent, replies}) => {
      if (!originalEvent) {
        return event;
      }

      this.logger.info(`Updating '${replies.length}' replies to updated message '${originalMessageId}'`);

      replies.forEach(reply => {
        reply.data.quote.message_id = event.id;
        // we want to update the messages quoting the original message later, thus the timeout
        setTimeout(() => this.eventService.replaceEvent(reply));
      });

      const decoratedData = Object.assign({}, event.data, {quote: originalEvent.data.quote});
      return Object.assign({}, event, {data: decoratedData});
    });
  }

  _handleAddEvent(event) {
    const rawQuote = event.data && event.data.quote;

    if (!rawQuote) {
      return Promise.resolve(event);
    }

    const quote = Quote.decode(base64ToArraySync(rawQuote));
    this.logger.info('Found quoted message', quote);

    const messageId = quote.quotedMessageId;

    return this.eventService.loadEvent(event.conversation, messageId).then(quotedMessage => {
      if (!quotedMessage) {
        this.logger.warn(`Quoted message with ID "${messageId}" not found.`);
        const quoteData = {
          error: {
            type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND,
          },
        };

        const decoratedData = Object.assign({}, event.data, {quote: quoteData});
        return Promise.resolve(Object.assign({}, event, {data: decoratedData}));
      }

      const quotedMessageHash = new Uint8Array(quote.quotedMessageSha256).buffer;

      return MessageHasher.validateHash(quotedMessage, quotedMessageHash).then(isValid => {
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

        const decoratedData = Object.assign({}, event.data, {quote: quoteData});
        return Promise.resolve(Object.assign({}, event, {data: decoratedData}));
      });
    });
  }

  _findRepliesToMessage(conversationId, messageId) {
    return this.eventService.loadEvent(conversationId, messageId).then(originalEvent => {
      if (!originalEvent) {
        return {
          replies: [],
        };
      }
      return this.eventService
        .loadEventsReplyingToMessage(conversationId, messageId, originalEvent.time)
        .then(replies => ({
          originalEvent,
          replies,
        }));
    });
  }
}
