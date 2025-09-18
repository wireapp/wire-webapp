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

import type {ConversationRepository} from 'Repositories/conversation/ConversationRepository';
import {ConfirmationEvent} from 'Repositories/conversation/EventBuilder';
import {User} from 'Repositories/entity/User';
import type {EventRecord} from 'Repositories/storage/record/EventRecord';
import {getLogger, Logger} from 'Util/Logger';

import {StatusType} from '../../../message/StatusType';
import {ClientEvent} from '../Client';
import {EventMiddleware, IncomingEvent} from '../EventProcessor';
import type {EventService} from '../EventService';

export class ReceiptsMiddleware implements EventMiddleware {
  private readonly logger: Logger;

  constructor(
    private readonly eventService: EventService,
    private readonly conversationRepository: ConversationRepository,
    private readonly selfUser: User,
  ) {
    this.logger = getLogger('ReceiptsMiddleware');
  }

  /**
   * Handles incoming (and injected outgoing) events.
   */
  async processEvent(event: IncomingEvent): Promise<IncomingEvent> {
    switch (event.type) {
      case ClientEvent.CONVERSATION.ASSET_ADD:
      case ClientEvent.CONVERSATION.KNOCK:
      case ClientEvent.CONVERSATION.LOCATION:
      case ClientEvent.CONVERSATION.MESSAGE_ADD: {
        const qualifiedConversation = event.qualified_conversation || {domain: '', id: event.conversation};
        const conversation = await this.conversationRepository.getConversationById(qualifiedConversation);
        if (conversation?.isGroupOrChannel()) {
          // We only override the value of expects_read_confirmation for group conversations (one to one conversation use the value set by the sender)
          event.data.expects_read_confirmation = conversation.receiptMode() === RECEIPT_MODE.ON;
        }
        return event;
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
    return this.selfUser.id === originalEvent.from;
  }

  private updateConfirmationStatus(
    originalEvent: EventRecord,
    confirmationEvent: ConfirmationEvent,
  ): Promise<EventRecord | void> {
    const status = confirmationEvent.data.status;
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
