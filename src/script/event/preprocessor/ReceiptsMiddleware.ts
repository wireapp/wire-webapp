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

import {Confirmation} from '@wireapp/protocol-messaging';

import {getLogger, Logger} from 'Util/Logger';

import {StatusType} from '../../message/StatusType';
import {ClientEvent} from '../Client';
import type {ConversationRepository} from '../../conversation/ConversationRepository';
import type {EventService} from '../EventService';
import type {EventRecord} from '../../storage/EventRecord';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';

export class ReceiptsMiddleware {
  private readonly eventService: EventService;
  private readonly conversationRepository: ConversationRepository;
  private readonly logger: Logger;

  constructor(
    eventService: EventService,
    conversationRepository: ConversationRepository,
    private readonly userState = container.resolve(UserState),
  ) {
    this.eventService = eventService;
    this.conversationRepository = conversationRepository;
    this.logger = getLogger('ReadReceiptMiddleware');
  }

  /**
   * Handles incoming (and injected outgoing) events.
   */
  processEvent(event: EventRecord): Promise<EventRecord> {
    switch (event.type) {
      case ClientEvent.CONVERSATION.ASSET_ADD:
      case ClientEvent.CONVERSATION.KNOCK:
      case ClientEvent.CONVERSATION.LOCATION:
      case ClientEvent.CONVERSATION.MESSAGE_ADD: {
        return this.conversationRepository.get_conversation_by_id(event.conversation).then(conversation => {
          if (conversation && conversation.isGroup()) {
            const expectsReadConfirmation = conversation.receiptMode() === Confirmation.Type.READ;
            event.data.expects_read_confirmation = !!expectsReadConfirmation;
          }
          return event;
        });
      }
      case ClientEvent.CONVERSATION.CONFIRMATION: {
        const messageIds = event.data.more_message_ids.concat(event.data.message_id);
        return this.eventService
          .loadEvents(event.conversation, messageIds)
          .then((originalEvents: EventRecord[]) => {
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

  isMyMessage(originalEvent: EventRecord): boolean {
    return this.userState.self() && this.userState.self().id === originalEvent.from;
  }

  private _updateConfirmationStatus(
    originalEvent: EventRecord,
    confirmationEvent: EventRecord,
  ): Promise<EventRecord | void> {
    const status = confirmationEvent.data.status;
    const currentReceipts = originalEvent.read_receipts || [];

    // I shouldn't receive this read receipt
    if (!this.isMyMessage(originalEvent)) {
      return Promise.resolve();
    }

    const hasReadMessage =
      status === StatusType.SEEN && currentReceipts.some(({userId}) => confirmationEvent.from === userId);
    if (hasReadMessage) {
      // if the user is already among the readers of the message, nothing more to do
      return Promise.resolve();
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
