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

import {useLayoutEffect, useState} from 'react';

export const MEETING_NOTIFICATION_HOST_ELEMENT_ID = {
  CONVERSATIONS: 'conversations',
  CENTER_COLUMN: 'center-column',
  WIRE_MAIN: 'wire-main',
} as const;

type MeetingNotificationHostElementState = {
  meetingNotificationHostElement: HTMLElement | null;
  setMeetingNotificationHostElement: (element: HTMLElement | null) => void;
};

export const useMeetingNotificationHostElement = (): MeetingNotificationHostElementState => {
  const [conversationsElement, setConversationsElement] = useState<HTMLElement | null>(null);
  const [wireMainElement, setWireMainElement] = useState<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const existing = document.getElementById(MEETING_NOTIFICATION_HOST_ELEMENT_ID.WIRE_MAIN);
    if (existing) {
      setWireMainElement(existing);
      return undefined;
    }

    const observer = new MutationObserver(() => {
      const wireMain = document.getElementById(MEETING_NOTIFICATION_HOST_ELEMENT_ID.WIRE_MAIN);
      if (wireMain) {
        setWireMainElement(wireMain);
        observer.disconnect();
      }
    });
    observer.observe(document.body, {childList: true, subtree: true});

    return () => observer.disconnect();
  }, []);

  return {
    meetingNotificationHostElement: conversationsElement ?? wireMainElement,
    setMeetingNotificationHostElement: setConversationsElement,
  };
};
