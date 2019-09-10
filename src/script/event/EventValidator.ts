/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {CONVERSATION_EVENT, ConversationOtrMessageAddNotification} from '@wireapp/api-client/dist/commonjs/event';
import {NotificationPayload} from '@wireapp/api-client/dist/commonjs/notification';
import {EventSource} from './EventSource';
import {EventValidation} from './EventValidation';

export function handleEventValidation(
  event: NotificationPayload,
  source: EventSource,
  lastEventDate?: string,
): EventValidation {
  const eventType = event.type as CONVERSATION_EVENT;
  const canSkipVerification = [CONVERSATION_EVENT.TYPING];
  if (canSkipVerification.includes(eventType)) {
    return EventValidation.IGNORED_TYPE;
  }

  const eventDate = (event as ConversationOtrMessageAddNotification).time;
  const isFromNotificationStream = source === EventSource.STREAM;
  const shouldCheckEventDate = eventDate && isFromNotificationStream && lastEventDate;

  if (shouldCheckEventDate) {
    const isOutdated = new Date(lastEventDate).getTime() >= new Date(eventDate).getTime();
    if (isOutdated) {
      return EventValidation.OUTDATED_TIMESTAMP;
    }
  }

  return EventValidation.VALID;
}
