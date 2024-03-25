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

import {CONVERSATION_EVENT, USER_EVENT} from '@wireapp/api-client/lib/event/';

import {EventSource} from './EventSource';
import {EventValidation} from './EventValidation';

export function validateEvent(
  event: {time: string; type: CONVERSATION_EVENT | USER_EVENT},
  source: EventSource,
  lastEventDate?: string,
): EventValidation {
  const eventTime = event.time;
  const isFromNotificationStream = source === EventSource.NOTIFICATION_STREAM;
  const shouldCheckEventDate = !!eventTime && isFromNotificationStream && lastEventDate;

  if (shouldCheckEventDate) {
    /** This check prevents duplicated "You joined" system messages. */
    const isOutdated = new Date(lastEventDate).getTime() >= new Date(eventTime).getTime();
    if (isOutdated) {
      return EventValidation.OUTDATED_TIMESTAMP;
    }
  }

  return EventValidation.VALID;
}
