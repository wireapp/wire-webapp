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

import {MessageAddEvent, MultipartMessageAddEvent} from 'Repositories/conversation/EventBuilder';
import {StoredEvent} from 'Repositories/storage';
import {EventError} from 'src/script/error/EventError';

import {getCommonMessageUpdates} from './getCommonMessageUpdates';

import {CONVERSATION, ClientEvent} from '../../../Client';
import {EventHandler, HandledEvents} from '../types';

function throwValidationError(message: string): never {
  throw new EventError(EventError.TYPE.VALIDATION_FAILED, `Event validation failed: ${message}`);
}

export type EditableEvent = MessageAddEvent | MultipartMessageAddEvent;

function validateEditEvent(
  originalEvent: HandledEvents | undefined,
  editEvent: EditableEvent,
): originalEvent is StoredEvent<EditableEvent> {
  if (!originalEvent) {
    throwValidationError('Edit event without original event');
  }

  if (
    originalEvent.type !== ClientEvent.CONVERSATION.MESSAGE_ADD &&
    originalEvent.type !== ClientEvent.CONVERSATION.MULTIPART_MESSAGE_ADD
  ) {
    throwValidationError('Edit event for non-text message');
  }

  // do not allow invalid cross-type edits
  if (originalEvent.type !== editEvent.type) {
    throwValidationError('Edit event type does not match original event type');
  }

  if (originalEvent.from !== editEvent.from) {
    throwValidationError('ID reused by other user');
  }

  return true;
}

function getUpdatesForEditMessage(originalEvent: StoredEvent<EditableEvent>, newEvent: EditableEvent): EditableEvent {
  // Remove reactions, so that likes (hearts) don't stay when a message's text gets edited
  const commonUpdates = getCommonMessageUpdates(originalEvent, newEvent);

  return {...newEvent, ...commonUpdates, edited_time: newEvent.time, reactions: {}};
}

function computeEventUpdates(originalEvent: StoredEvent<EditableEvent>, newEvent: EditableEvent) {
  const primaryKeyUpdate = {primary_key: originalEvent.primary_key};
  const updates = getUpdatesForEditMessage(originalEvent, newEvent);

  return {...primaryKeyUpdate, ...updates};
}

export const handleEditEvent: EventHandler = async (event, {findEvent}) => {
  if (event.type !== CONVERSATION.MESSAGE_ADD && event.type !== CONVERSATION.MULTIPART_MESSAGE_ADD) {
    return undefined;
  }
  const editedEventId = event.data.replacing_message_id;
  if (!editedEventId) {
    return undefined;
  }
  const originalEvent = await findEvent(editedEventId);
  if (validateEditEvent(originalEvent, event)) {
    const updatedEvent = computeEventUpdates(originalEvent, event);
    return {type: 'update', event: updatedEvent, updates: updatedEvent};
  }
  return undefined;
};
