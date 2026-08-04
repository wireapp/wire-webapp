/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
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

import {useState} from 'react';

export const MEETING_NOTIFICATION_HOST_ELEMENT_ID = {
  CONVERSATIONS: 'conversations',
  CENTER_COLUMN: 'center-column',
} as const;

type MeetingNotificationHostElementState = {
  meetingNotificationHostElement: HTMLElement | null;
  setMeetingNotificationHostElement: (element: HTMLElement | null) => void;
};

export const useMeetingNotificationHostElement = (
  wireMainElement: HTMLElement | null,
): MeetingNotificationHostElementState => {
  const [conversationsElement, setConversationsElement] = useState<HTMLElement | null>(null);

  return {
    meetingNotificationHostElement: conversationsElement ?? wireMainElement,
    setMeetingNotificationHostElement: setConversationsElement,
  };
};
