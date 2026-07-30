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

import {create} from 'zustand';

export type MeetingNotificationKind = 'invite' | 'update' | 'cancelled';

export type MeetingNotification = {
  kind: MeetingNotificationKind;
  count: number;
  meetingTitles: string[];
};

type AddNotificationInput = {
  kind: MeetingNotificationKind;
  meetingTitle: string;
};

type MeetingNotificationStore = {
  notifications: MeetingNotification[];
  addNotification: (input: AddNotificationInput) => void;
  dismissNotification: (kind: MeetingNotificationKind) => void;
  clearNotifications: () => void;
};

const notificationOrder: MeetingNotificationKind[] = ['invite', 'update', 'cancelled'];

export const useMeetingNotificationStore = create<MeetingNotificationStore>(set => ({
  notifications: [],
  addNotification: ({kind, meetingTitle}) =>
    set(state => {
      const existingNotification = state.notifications.find(notification => notification.kind === kind);
      const notifications = existingNotification
        ? state.notifications.map(notification =>
            notification.kind === kind
              ? {
                  ...notification,
                  count: notification.count + 1,
                  meetingTitles: notification.meetingTitles.includes(meetingTitle)
                    ? notification.meetingTitles
                    : [...notification.meetingTitles, meetingTitle],
                }
              : notification,
          )
        : [...state.notifications, {kind, count: 1, meetingTitles: [meetingTitle]}];

      return {
        notifications: [...notifications].sort(
          (left, right) => notificationOrder.indexOf(left.kind) - notificationOrder.indexOf(right.kind),
        ),
      };
    }),
  dismissNotification: kind =>
    set(state => ({notifications: state.notifications.filter(notification => notification.kind !== kind)})),
  clearNotifications: () => set({notifications: []}),
}));
