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
import {isOutdatedNotificationStreamEvent} from './outdatedNotificationStreamEventTypes';

describe('isOutdatedNotificationStreamEvent', () => {
  const eventTime = '2026-05-28T06:37:31.673Z';
  const lastEventDate = new Date(eventTime);

  it('marks duplicate-risk events with an equal timestamp as outdated on the notification stream', () => {
    expect(
      isOutdatedNotificationStreamEvent(
        {time: eventTime, type: CONVERSATION_EVENT.MEMBER_JOIN},
        NotificationSource.NOTIFICATION_STREAM,
        lastEventDate,
      ),
    ).toBe(true);
  });

  it('does not mark OTR message events with an equal timestamp as outdated', () => {
    expect(
      isOutdatedNotificationStreamEvent(
        {time: eventTime, type: CONVERSATION_EVENT.OTR_MESSAGE_ADD},
        NotificationSource.NOTIFICATION_STREAM,
        lastEventDate,
      ),
    ).toBe(false);
  });

  it('does not apply the outdated check outside the notification stream', () => {
    expect(
      isOutdatedNotificationStreamEvent(
        {time: eventTime, type: CONVERSATION_EVENT.MEMBER_JOIN},
        NotificationSource.WEBSOCKET,
        lastEventDate,
      ),
    ).toBe(false);
  });
});
