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

export default class ReadReceiptMiddleware {
  /**
   * Construct a new ReadReceiptMiddleware.
   * This class is reponsible for parsing incoming text messages that contains quoted messages.
   * It will handle validating the quote and adding metadata to the event.
   *
   * @param {z.event.EventService} eventService - Repository that handles events
   * @param {z.message.MessageHasher} messageHasher - Handles hashing messages
   */
  constructor(eventService, messageHasher) {
    this.eventService = eventService;
    this.logger = new z.util.Logger('ReadReceiptMiddleware', z.config.LOGGER.OPTIONS);
  }

  /**
   * Handles validation of the event if it contains a quote.
   * If the event does contain a quote, will also decorate the event with some metadata regarding the quoted message
   *
   * @param {Object} event - event in the DB format
   * @returns {Promise<Object>} event - the original event if no quote is found (or does not validate). The decorated event if the quote is valid
   */
  processEvent(event) {
    switch (event.type) {
      case z.event.Client.CONVERSATION.CONFIRMATION:
        this.logger.info(`Received confirmation from '${event.from}' for message '${event.data.message_id}'`);
        return this.eventService
          .loadEvent(event.conversation, event.data.message_id)
          .then(originalEvent => {
            if (!originalEvent) {
              return;
            }
            const updatedEvent = Object.assign({}, originalEvent, {
              readReceipts: (originalEvent.readReceipts || []).concat([{time: event.time, userId: event.from}]),
            });

            return this.eventService.replaceEvent(updatedEvent);
          })
          .then(() => event);

      default:
        return Promise.resolve(event);
    }
  }
}
