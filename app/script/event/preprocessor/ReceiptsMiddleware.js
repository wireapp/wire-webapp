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

import StatusType from '../../message/StatusType';

export default class ReceiptsMiddleware {
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
        const messageIds = event.data.more_message_ids.concat(event.data.message_id);
        return this.eventService
          .loadEvents(event.conversation, messageIds)
          .then(originalEvents => {
            originalEvents.forEach(originalEvent => this._updateConfirmationStatus(originalEvent, event));
            this.logger.info(
              `Confirmed '${originalEvents.length}' messages with status '${event.data.status}' from '${event.from}'`,
              originalEvents
            );
          })
          .then(() => event);
      }

      default: {
        return Promise.resolve(event);
      }
    }
  }

  _updateConfirmationStatus(originalEvent, confirmationEvent) {
    const status = confirmationEvent.data.status;
    const currentReceipts = originalEvent.read_receipts || [];
    const hasReadMessage =
      status === StatusType.SEEN && currentReceipts.some(({from}) => confirmationEvent.from === from);
    if (hasReadMessage) {
      // if the user is already among the readers of the message, nothing more to do
      return;
    }
    const commonUpdates = {status};
    const readReceiptUpdate =
      status === StatusType.SEEN
        ? {read_receipts: currentReceipts.concat([{time: confirmationEvent.time, userId: confirmationEvent.from}])}
        : {};

    const updatedEvent = Object.assign({}, originalEvent, commonUpdates, readReceiptUpdate);

    return this.eventService.replaceEvent(updatedEvent);
  }
}
