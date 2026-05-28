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

import {CONVERSATION_EVENT} from '@wireapp/api-client/lib/event';

import {NotificationSource} from './notificationSource.types';

/**
 * Event types that can be handled locally (API response or pre-app init) and then
 * replayed on the notification stream with the same timestamp.
 *
 * @see ConversationJoin.tsx (member-join via guest link)
 * @see ConversationRepository injectEvent(..., BACKEND_RESPONSE)
 */
export const NOTIFICATION_STREAM_DUPLICATE_RISK_EVENT_TYPES: ReadonlySet<string> = new Set([
  CONVERSATION_EVENT.MEMBER_JOIN,
  CONVERSATION_EVENT.MEMBER_LEAVE,
  CONVERSATION_EVENT.CREATE,
  CONVERSATION_EVENT.RENAME,
  CONVERSATION_EVENT.PROTOCOL_UPDATE,
  CONVERSATION_EVENT.MESSAGE_TIMER_UPDATE,
  CONVERSATION_EVENT.RECEIPT_MODE_UPDATE,
  CONVERSATION_EVENT.ADD_PERMISSION_UPDATE,
]);

export function isOutdatedNotificationStreamEvent(
  event: {time?: string; type: string},
  source: string,
  lastEventDate?: Date,
): boolean {
  if (source !== NotificationSource.NOTIFICATION_STREAM) {
    return false;
  }

  if (event.time === undefined || event.time.length === 0 || lastEventDate === undefined) {
    return false;
  }

  if (!NOTIFICATION_STREAM_DUPLICATE_RISK_EVENT_TYPES.has(event.type)) {
    return false;
  }

  return lastEventDate.getTime() >= new Date(event.time).getTime();
}
