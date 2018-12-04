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
   * This class is reponsible for parsing incoming confirmation messages
   * It will update original messages when a confirmation is received
   *
   * @param {z.event.EventService} eventService - Repository that handles events
   */
  constructor(eventService) {
    this.eventService = eventService;
    this.logger = new z.util.Logger('ReadReceiptMiddleware', z.config.LOGGER.OPTIONS);
  }

  /**
   * Handles incoming confirmation events
   *
   * @param {Object} event - event in the DB format
   * @returns {Promise<Object>} event - the original event
   */
  processEvent(event) {
    switch (event.type) {
      case z.event.Client.CONVERSATION.CONFIRMATION: {
        this.logger.info(
          `Received confirmation of type '${event.data.status}' from '${event.from}' for message '${
            event.data.message_id
          }'`
        );
        return this.eventService
          .loadEvent(event.conversation, event.data.message_id)
          .then(originalEvent => {
            if (!originalEvent) {
              return;
            }
            const currentReadReceipts = originalEvent.read_receipts || [];
            if (currentReadReceipts.some(({from}) => event.from === from)) {
              // if the user is already among the readers of the message, nothing more to do
              return;
            }
            const updatedEvent = Object.assign({}, originalEvent, {
              read_receipts: currentReadReceipts.concat([{time: event.time, userId: event.from}]),
            });

            return this.eventService.replaceEvent(updatedEvent);
          })
          .then(() => event);
      }

      default: {
        return Promise.resolve(event);
      }
    }
  }
}
