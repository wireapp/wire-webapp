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

window.z = window.z || {};
window.z.event = z.event || {};
window.z.event.preprocessor = z.event.preprocessor || {};

z.event.preprocessor.QuotedMessageMiddleware = class QuotedMessageMiddleware {
  /**
   * Construct a new QuotedMessageMiddleware.
   * This class is reponsible for parsing incoming text messages that contains quoted messages.
   * It will handle validating the quote and adding metadata to the event.
   *
   * @param {z.event.EventService} eventService - Repository that handles events
   * @param {z.message.MessageHasher} messageHasher - Handles hashing messages
   */
  constructor(eventService, messageHasher) {
    this.eventService = eventService;
    this.messageHasher = messageHasher;
    this.logger = new z.util.Logger('z.event.preprocessor.QuotedMessageMiddleware', z.config.LOGGER.OPTIONS);
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
      case z.event.Client.CONVERSATION.MESSAGE_ADD:
        if (event.data.replacing_message_id) {
          return this._handleEditEvent(event);
        }
        return this._handleAddEvent(event);

      case z.event.Client.CONVERSATION.MESSAGE_DELETE:
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
        reply.data.quote = {error: {type: z.message.QuoteEntity.ERROR.MESSAGE_NOT_FOUND}};
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

    const quote = z.proto.Quote.decode64(rawQuote);
    this.logger.info('Found quoted message', quote);

    return this.eventService.loadEvent(event.conversation, quote.quoted_message_id).then(quotedMessage => {
      if (!quotedMessage) {
        this.logger.warn(`Quoted message with ID "${quote.quoted_message_id}" not found.`);
        const quoteData = {
          error: {
            type: z.message.QuoteEntity.ERROR.MESSAGE_NOT_FOUND,
          },
        };

        const decoratedData = Object.assign({}, event.data, {quote: quoteData});
        return Promise.resolve(Object.assign({}, event, {data: decoratedData}));
      }

      return this.messageHasher
        .validateHash(quotedMessage, quote.quoted_message_sha256.toArrayBuffer())
        .then(isValid => {
          let quoteData;

          if (!isValid) {
            this.logger.warn(`Quoted message hash for message ID "${quote.quoted_message_id}" does not match.`);
            quoteData = {
              error: {
                type: z.message.QuoteEntity.ERROR.INVALID_HASH,
              },
            };
          } else {
            quoteData = {
              message_id: quote.quoted_message_id,
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
};
