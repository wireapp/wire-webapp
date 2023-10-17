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
import {EventRecord, StoredEvent} from 'src/script/storage';

import {ClientEvent} from '../../Client';

export function getEditedMessageId(event: MessageAddEvent) {
  return event.data.replacing_message_id;
}
function throwValidationError(message: string) {
  throw new EventError(EventError.TYPE.VALIDATION_FAILED, `Event validation failed: ${message}`);
}

export function isValidEditEvent(
  originalEvent: EventRecord | undefined,
  editEvent: MessageAddEvent,
): originalEvent is StoredEvent<MessageAddEvent> | never {
  const {previews} = editEvent.data;
  if (!originalEvent) {
    if (!previews?.length) {
      throwValidationError('Edit event without original event');
    }
    // the only valid case of a replacement with no original message is when an edited message gets a link preview
    return true;
  }

  if (originalEvent.type !== ClientEvent.CONVERSATION.MESSAGE_ADD) {
    throwValidationError('Edit event for non-text message');
  }

  if (originalEvent.from !== editEvent.from) {
    throwValidationError('ID reused by other user');
  }
  return true;
}
