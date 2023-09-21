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

import {RECEIPT_MODE} from '@wireapp/api-client/lib/conversation/data';
import {container} from 'tsyringe';

import {getLogger, Logger} from 'Util/Logger';

import type {ConversationRepository} from '../../conversation/ConversationRepository';
import {StatusType} from '../../message/StatusType';
import type {EventRecord} from '../../storage/record/EventRecord';
import {UserState} from '../../user/UserState';
import {ClientEvent} from '../Client';
import type {EventService} from '../EventService';

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
    this.logger = getLogger('ReceiptsMiddleware');
  }

  /**
   * Handles incoming (and injected outgoing) events.
   */
  async processEvent(event: EventRecord): Promise<EventRecord> {
    switch (event.type) {
      case ClientEvent.CONVERSATION.ASSET_ADD:
      case ClientEvent.CONVERSATION.KNOCK:
      case ClientEvent.CONVERSATION.LOCATION:
      case ClientEvent.CONVERSATION.MESSAGE_ADD: {
        const qualifiedConversation = event.qualified_conversation || {domain: '', id: event.conversation};
        return this.conversationRepository.getConversationById(qualifiedConversation).then(conversation => {
          if (conversation && conversation.isGroup()) {
            const expectsReadConfirmation = conversation.receiptMode() === RECEIPT_MODE.ON;
            event.data.expects_read_confirmation = !!expectsReadConfirmation;
          }
          return event;
        });
      }
      case ClientEvent.CONVERSATION.CONFIRMATION: {
        const messageIds = event.data.more_message_ids.concat(event.data.message_id);
        const originalEvents = await this.eventService.loadEvents(event.conversation, messageIds);
        originalEvents.forEach(originalEvent => this.updateConfirmationStatus(originalEvent, event));
        this.logger.info(
          `Confirmed '${originalEvents.length}' messages with status '${event.data.status}' from '${event.from}'`,
        );
        return event;
      }
      default: {
        return Promise.resolve(event);
      }
    }
  }

  private isMyMessage(originalEvent: EventRecord): boolean {
    return this.userState.self() && this.userState.self().id === originalEvent.from;
  }

  private updateConfirmationStatus(
    originalEvent: EventRecord,
    confirmationEvent: EventRecord,
  ): Promise<EventRecord | void> {
    const {status} = confirmationEvent.data;
    const currentReceipts = ('read_receipts' in originalEvent && originalEvent.read_receipts) || [];

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
