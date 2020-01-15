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

import {getLogger} from 'Util/Logger';

import {ReceiptMode} from '../../conversation/ReceiptMode';
import {StatusType} from '../../message/StatusType';
import {ClientEvent} from '../Client';

export class ReceiptsMiddleware {
  /**
   * Construct a new ReadReceiptMiddleware.
   * This class is responsible for parsing incoming confirmation messages
   * It will update original messages when a confirmation is received
   *
   * @param {EventService} eventService - Repository that handles events
   * @param {UserRepository} userRepository - Repository that handles users
   * @param {ConversationRepository} conversationRepository -  Repository for conversation interactions
   */
  constructor(eventService, userRepository, conversationRepository) {
    this.eventService = eventService;
    this.userRepository = userRepository;
    this.conversationRepository = conversationRepository;
    this.logger = getLogger('ReadReceiptMiddleware');
  }

  /**
   * Handles incoming (and injected outgoing) events.
   *
   * @param {Object} event - event in the DB format
   * @returns {Promise<Object>} event - the original event
   */
  processEvent(event) {
    switch (event.type) {
      case ClientEvent.CONVERSATION.ASSET_ADD:
      case ClientEvent.CONVERSATION.KNOCK:
      case ClientEvent.CONVERSATION.LOCATION:
      case ClientEvent.CONVERSATION.MESSAGE_ADD: {
        return this.conversationRepository.get_conversation_by_id(event.conversation).then(conversation => {
          if (conversation && conversation.isGroup()) {
            const expectsReadConfirmation = conversation.receiptMode() === ReceiptMode.DELIVERY_AND_READ;
            event.data.expects_read_confirmation = !!expectsReadConfirmation;
          }
          return event;
        });
      }
      case ClientEvent.CONVERSATION.CONFIRMATION: {
        const messageIds = event.data.more_message_ids.concat(event.data.message_id);
        return this.eventService
          .loadEvents(event.conversation, messageIds)
          .then(originalEvents => {
            originalEvents.forEach(originalEvent => this._updateConfirmationStatus(originalEvent, event));
            this.logger.info(
              `Confirmed '${originalEvents.length}' messages with status '${event.data.status}' from '${event.from}'`,
              originalEvents,
            );
          })
          .then(() => event);
      }

      default: {
        return Promise.resolve(event);
      }
    }
  }

  isMyMessage(originalEvent) {
    return this.userRepository.self() && this.userRepository.self().id === originalEvent.from;
  }

  _updateConfirmationStatus(originalEvent, confirmationEvent) {
    const status = confirmationEvent.data.status;
    const currentReceipts = originalEvent.read_receipts || [];

    // I shouldn't receive this read receipt
    if (!this.isMyMessage(originalEvent)) {
      return;
    }

    const hasReadMessage =
      status === StatusType.SEEN && currentReceipts.some(({userId}) => confirmationEvent.from === userId);
    if (hasReadMessage) {
      // if the user is already among the readers of the message, nothing more to do
      return;
    }
    const commonUpdates = {status};
    const readReceiptUpdate =
      status === StatusType.SEEN
        ? {read_receipts: currentReceipts.concat([{time: confirmationEvent.time, userId: confirmationEvent.from}])}
        : {};

    const updatedEvent = {...originalEvent, ...commonUpdates, ...readReceiptUpdate};

    return this.eventService.replaceEvent(updatedEvent);
  }
}
