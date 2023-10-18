/*
 * Wire
 * Copyright (C) 2023 Wire Swiss GmbH
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

import {User} from 'src/script/entity/User';

import {handleLinkPreviewEvent, handleEditEvent, handleAssetEvent} from './eventHandlers';
import {EventValidationError} from './eventHandlers/EventValidationError';
import {HandledEvents, DBOperation} from './types';

import {isEventRecordFailed, isEventRecordWithFederationError} from '../../../message/StatusType';
import type {EventRecord} from '../../../storage';
import {CONVERSATION} from '../../Client';
import {EventMiddleware, IncomingEvent} from '../../EventProcessor';
import {EventService} from '../../EventService';
import {eventShouldBeStored} from '../../EventTypeHandling';

export class EventStorageMiddleware implements EventMiddleware {
  constructor(
    private readonly eventService: EventService,
    private readonly selfUser: User,
  ) {}

  async processEvent(event: IncomingEvent) {
    const shouldSaveEvent = eventShouldBeStored(event);
    if (!shouldSaveEvent) {
      return event;
    }
    const eventId = 'id' in event && event.id;
    const duplicateEvent = eventId ? await this.eventService.loadEvent(event.conversation, eventId) : undefined;

    this.validateEvent(event, duplicateEvent);
    const operation = await this.getDbOperation(event, duplicateEvent);
    return operation ? this.execDBOperation(operation, event.conversation) : event;
  }

  private async getDbOperation(event: HandledEvents, duplicateEvent?: HandledEvents): Promise<DBOperation | undefined> {
    const handlers = [handleEditEvent, handleLinkPreviewEvent, handleAssetEvent];
    for (const handler of handlers) {
      const operation = await handler(event, {
        duplicateEvent,
        selfUserId: this.selfUser.id,
        findEvent: eventId => this.eventService.loadEvent(event.conversation, eventId),
      });
      if (operation) {
        return operation;
      }
    }
    return {type: 'insert', event};
  }

  private validateEvent(event: HandledEvents, duplicateEvent?: EventRecord) {
    if (!duplicateEvent) {
      return;
    }
    if (duplicateEvent.from !== event.from) {
      throw new EventValidationError('ID previously used by another user');
    }

    if (event.type !== duplicateEvent.type) {
      throw new EventValidationError('ID already used for a different type of message');
    }

    if (event.type === CONVERSATION.MESSAGE_ADD && duplicateEvent.type === CONVERSATION.MESSAGE_ADD) {
      const isValidUpdate = !!event.data.previews?.length || event.data.replacing_message_id;
      const isRetryAttempt = isEventRecordFailed(duplicateEvent) || isEventRecordWithFederationError(duplicateEvent);

      if (!isValidUpdate && !isRetryAttempt) {
        throw new EventValidationError('ID already used for a successfully sent message');
      }
    }
  }

  private async execDBOperation(operation: DBOperation, conversationId: string) {
    switch (operation.type) {
      case 'insert':
        return this.eventService.saveEvent(operation.event);

      case 'update':
        await this.eventService.replaceEvent(operation.updates);
        break;

      case 'delete':
        await this.eventService.deleteEvent(conversationId, operation.id);
    }
    return operation.event;
  }
}
