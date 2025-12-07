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

import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';
import {container} from 'tsyringe';

import {ConversationState} from 'Repositories/conversation/ConversationState';
import {User} from 'Repositories/entity/User';
import type {EventRecord} from 'Repositories/storage';
import {UserFilter} from 'Repositories/user/UserFilter';
import {matchQualifiedIds} from 'Util/QualifiedId';

import {handleLinkPreviewEvent, handleEditEvent, handleAssetEvent, handleReactionEvent} from './eventHandlers';
import {EventValidationError} from './eventHandlers/EventValidationError';
import {HandledEvents, DBOperation} from './types';

import {isEventRecordFailed, isEventRecordWithFederationError} from '../../../../message/StatusType';
import {CONVERSATION} from '../../Client';
import {EventMiddleware, IncomingEvent} from '../../EventProcessor';
import {EventService} from '../../EventService';
import {EventSource} from '../../EventSource';
import {eventShouldBeStored} from '../../EventTypeHandling';

export class EventStorageMiddleware implements EventMiddleware {
  constructor(
    private readonly eventService: EventService,
    private readonly selfUser: User,
    private readonly conversationState: ConversationState = container.resolve(ConversationState),
  ) {}

  async processEvent(event: IncomingEvent, source: EventSource) {
    const shouldSaveEvent = eventShouldBeStored(event);
    if (!shouldSaveEvent) {
      return event;
    }
    const eventId = 'id' in event && event.id;
    /* We try to load a potential duplicate of the event (same ID, same conversation in the DB). There are multiple valid cases for duplicates:
     * - The event is a retry of a previously failed event
     * - The event is a link preview of a text message previously sent
     * - The event is an asset upload success of a metadata asset message
     */
    const duplicateEvent = eventId ? await this.eventService.loadEvent(event.conversation, eventId) : undefined;

    // We first validate that the event is valid
    this.validateEvent(event, source, duplicateEvent);
    // Then ask the different handlers which DB operations to perform
    const operation = await this.getDbOperation(event, duplicateEvent);
    // And finally execute the operation
    return this.execDBOperation(operation, event.conversation);
  }

  private async getDbOperation(event: HandledEvents, duplicateEvent?: HandledEvents): Promise<DBOperation> {
    const handlers = [handleLinkPreviewEvent, handleEditEvent, handleAssetEvent, handleReactionEvent];
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

  private validateEvent(event: HandledEvents, source: EventSource, duplicateEvent?: EventRecord) {
    if (event.type === CONVERSATION_EVENT.MEMBER_LEAVE && source !== EventSource.NOTIFICATION_STREAM) {
      /*
        When we receive a `member-leave` event that is not from the notification stream
        we should check that the user is actually still part of the
        conversation before forwarding the event. If the user is already not part
        of the conversation, then we can throw a validation error
        (that means the user was already removed by another member-leave event)
      */
      if (!event.qualified_conversation) {
        return;
      }
      const conversation = this.conversationState.findConversation(event.qualified_conversation);

      const qualifiedUserIds = event.data.qualified_user_ids;

      if (!conversation || !qualifiedUserIds) {
        return;
      }

      const usersNotPartofConversation = qualifiedUserIds.reduce((acc, qualifiedUserId) => {
        const isDeleted = conversation
          .allUserEntities()
          .find(user => matchQualifiedIds(user.qualifiedId, qualifiedUserId))?.isDeleted;

        const isParticipant = UserFilter.isParticipant(conversation, qualifiedUserId);

        return acc || isDeleted || !isParticipant;
      }, false);

      if (usersNotPartofConversation) {
        throw new EventValidationError('User is not part of the conversation');
      }
    }

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

      case 'sequential-update':
        await this.eventService.updateEventSequentially(operation.updates);
        break;

      case 'delete':
        await this.eventService.deleteEvent(conversationId, operation.id);
    }
    return operation.event;
  }
}
