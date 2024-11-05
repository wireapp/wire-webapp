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

import {MessageAddEvent} from 'Repositories/conversation/EventBuilder';
import {StoredEvent} from 'Repositories/storage';
import {categoryFromEvent} from 'src/script/message/MessageCategorization';

import {EventValidationError} from './EventValidationError';
import {getCommonMessageUpdates} from './getCommonMessageUpdates';

import {CONVERSATION, ClientEvent} from '../../../Client';
import {EventHandler, HandledEvents} from '../types';

function getLinkPreviewUpdates(originalEvent: StoredEvent<MessageAddEvent>, newEvent: MessageAddEvent) {
  const commonUpdates = getCommonMessageUpdates(originalEvent, newEvent);

  return {
    ...newEvent,
    ...commonUpdates,
    category: categoryFromEvent(newEvent),
    ephemeral_expires: originalEvent.ephemeral_expires,
    ephemeral_started: originalEvent.ephemeral_started,
    ephemeral_time: originalEvent.ephemeral_time,
    server_time: newEvent.time,
    version: originalEvent.version,
  };
}

function validateLinkPreviewEvent(
  originalEvent: HandledEvents | undefined,
  editEvent: MessageAddEvent,
): originalEvent is StoredEvent<MessageAddEvent> {
  const {previews, content} = editEvent.data;
  if (!previews?.length) {
    return false;
  }
  if (!originalEvent) {
    // It is fine to receive a linkPreview message without the original event
    return false;
  }
  if (originalEvent.type !== ClientEvent.CONVERSATION.MESSAGE_ADD) {
    throw new EventValidationError('Link preview event for non-text message');
  }

  const {previews: originalPreviews, content: originalContent} = originalEvent.data;
  if (!!originalPreviews?.length) {
    throw new EventValidationError('Link preview already existing on original message');
  }

  if (content !== originalContent) {
    throw new EventValidationError('Link preview with different text content');
  }
  return true;
}

function computeEventUpdates(originalEvent: StoredEvent<MessageAddEvent>, newEvent: MessageAddEvent) {
  const primaryKeyUpdate = {primary_key: originalEvent.primary_key};
  const updates = getLinkPreviewUpdates(originalEvent, newEvent);

  return {...primaryKeyUpdate, ...updates};
}

export const handleLinkPreviewEvent: EventHandler = async (event, {duplicateEvent}) => {
  if (event.type !== CONVERSATION.MESSAGE_ADD) {
    return undefined;
  }
  if (validateLinkPreviewEvent(duplicateEvent, event)) {
    const updatedEvent = computeEventUpdates(duplicateEvent, event);
    return {type: 'update', event: updatedEvent, updates: updatedEvent};
  }
  return undefined;
};
