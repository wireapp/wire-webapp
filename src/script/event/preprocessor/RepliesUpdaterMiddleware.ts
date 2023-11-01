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

import {DeleteEvent, MessageAddEvent} from 'src/script/conversation/EventBuilder';
import {getLogger, Logger} from 'Util/Logger';

import {QuoteEntity} from '../../message/QuoteEntity';
import {StoredEvent} from '../../storage/record/EventRecord';
import {ClientEvent} from '../Client';
import {EventMiddleware, IncomingEvent} from '../EventProcessor';
import type {EventService} from '../EventService';

export class RepliesUpdaterMiddleware implements EventMiddleware {
  private readonly logger: Logger;

  constructor(private readonly eventService: EventService) {
    this.logger = getLogger('QuotedMessageMiddleware');
  }

  /**
   * Will update all the messages that refer to a particular edited message
   *
   * @param event event in the DB format
   */
  async processEvent(event: IncomingEvent): Promise<IncomingEvent> {
    switch (event.type) {
      case ClientEvent.CONVERSATION.MESSAGE_ADD: {
        const originalMessageId = event.data.replacing_message_id;
        return originalMessageId ? this.handleEditEvent(event, originalMessageId) : event;
      }

      case ClientEvent.CONVERSATION.MESSAGE_DELETE: {
        return this.handleDeleteEvent(event);
      }
    }
    return event;
  }

  /**
   * will invalidate all the replies to a deleted message
   */
  private async handleDeleteEvent(event: DeleteEvent): Promise<DeleteEvent> {
    const originalMessageId = event.data.message_id;
    const {replies} = await this.findRepliesToMessage(event.conversation, originalMessageId);
    this.logger.info(`Invalidating '${replies.length}' replies to deleted message '${originalMessageId}'`);
    replies.forEach(async reply => {
      reply.data.quote = {error: {type: QuoteEntity.ERROR.MESSAGE_NOT_FOUND}};
      await this.eventService.replaceEvent(reply);
    });
    return event;
  }

  /**
   * will update the message ID of all the replies to an edited message
   */
  private async handleEditEvent(event: MessageAddEvent, originalMessageId: string) {
    const {originalEvent, replies} = await this.findRepliesToMessage(event.conversation, originalMessageId, event.id);
    if (!originalEvent) {
      return event;
    }

    this.logger.info(`Updating '${replies.length}' replies to updated message '${originalMessageId}'`);
    replies.forEach(async reply => {
      const quote = reply.data.quote;
      if (quote && typeof quote !== 'string' && 'message_id' in quote && 'id' in event) {
        quote.message_id = event.id as string;
      }
      await this.eventService.replaceEvent(reply);
    });
    return event;
  }

  private async findRepliesToMessage(
    conversationId: string,
    messageId: string,
    /** in case the message was edited, we need to query the DB using the old event ID */
    previousMessageId?: string,
  ): Promise<{originalEvent?: MessageAddEvent; replies: StoredEvent<MessageAddEvent>[]}> {
    const originalEvent = await this.eventService.loadEvent(conversationId, previousMessageId ?? messageId);

    if (!originalEvent || originalEvent.type !== ClientEvent.CONVERSATION.MESSAGE_ADD) {
      return {
        replies: [],
      };
    }

    const replies = await this.eventService.loadEventsReplyingToMessage(conversationId, messageId, originalEvent.time);

    return {
      originalEvent,
      replies,
    };
  }
}
