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

'use strict';

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
    const rawQuote = event.data && event.data.quote;
    if (!rawQuote) {
      return Promise.resolve(event);
    }
    const quote = z.proto.Quote.decode64(rawQuote);
    this.logger.info('Found quoted message', quote);

    return this.eventService.loadEvent(event.conversation, quote.quoted_message_id).then(quotedMessage => {
      if (!quotedMessage) {
        this.logger.warn('Quoted message not found');
        return Promise.resolve(event);
      }
      const hash = this.messageHasher.hash(quotedMessage);
      // FIXME actually check the hash
      if (hash !== quote.quoted_message_sha256) {
        this.logger.warn('Quoted message hash does not match');
        return Promise.resolve(event);
      }

      // TODO parse quote and generate metadata
      const decoratedData = Object.assign({}, event.data, {
        message_id: quote.quoted_message_id,
        user_id: quotedMessage.from,
      });
      return Promise.resolve(Object.assign({}, event, {data: decoratedData}));
    });
  }
};
