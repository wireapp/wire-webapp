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

import {MessageAddEvent} from 'src/script/conversation/EventBuilder';
import {EventError} from 'src/script/error/EventError';
import {StoredEvent} from 'src/script/storage';

import {getCommonMessageUpdates} from './getCommonMessageUpdates';

import {CONVERSATION, ClientEvent} from '../../../Client';
import {EventHandler, HandledEvents} from '../types';

function throwValidationError(message: string): never {
  throw new EventError(EventError.TYPE.VALIDATION_FAILED, `Event validation failed: ${message}`);
}

function validateEditEvent(
  originalEvent: HandledEvents | undefined,
  editEvent: MessageAddEvent,
): originalEvent is StoredEvent<MessageAddEvent> {
  if (!originalEvent) {
    throwValidationError('Edit event without original event');
  }

  if (originalEvent.type !== ClientEvent.CONVERSATION.MESSAGE_ADD) {
    throwValidationError('Edit event for non-text message');
  }

  if (originalEvent.from !== editEvent.from) {
    throwValidationError('ID reused by other user');
  }

  return true;
}

function getUpdatesForEditMessage(
  originalEvent: StoredEvent<MessageAddEvent>,
  newEvent: MessageAddEvent,
): MessageAddEvent {
  // Remove reactions, so that likes (hearts) don't stay when a message's text gets edited
  const commonUpdates = getCommonMessageUpdates(originalEvent, newEvent);

  return {...newEvent, ...commonUpdates, reactions: {}};
}

function computeEventUpdates(originalEvent: StoredEvent<MessageAddEvent>, newEvent: MessageAddEvent) {
  const primaryKeyUpdate = {primary_key: originalEvent.primary_key};
  const updates = getUpdatesForEditMessage(originalEvent, newEvent);

  return {...primaryKeyUpdate, ...updates};
}

export const handleEditEvent: EventHandler = async (event, {findEvent}) => {
  if (event.type !== CONVERSATION.MESSAGE_ADD) {
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
