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

import {match} from 'ts-pattern';
import {create} from 'zustand';

export enum MeetingNotificationKind {
  INVITE = 'invite',
  UPDATE = 'update',
  CANCELLED = 'cancelled',
  ONGOING = 'ongoing',
}

type MeetingNotificationBase = {
  id: string;
  meetingTitle: string;
};

export type MeetingNotification =
  | (MeetingNotificationBase & {
      kind: MeetingNotificationKind.INVITE;
      organizer: string;
      meetingTime: string;
    })
  | (MeetingNotificationBase & {
      kind: MeetingNotificationKind.UPDATE;
      meetingTime: string;
    })
  | (MeetingNotificationBase & {
      kind: MeetingNotificationKind.CANCELLED;
      organizer: string;
      meetingTime: string;
    })
  | (MeetingNotificationBase & {
      kind: MeetingNotificationKind.ONGOING;
      organizer: string;
      meetingTime: string;
    });

export type AddNotificationInput =
  | {
      kind: MeetingNotificationKind.INVITE;
      meetingTitle: string;
      organizer: string;
      meetingTime: string;
    }
  | {
      kind: MeetingNotificationKind.UPDATE;
      meetingTitle: string;
      meetingTime: string;
    }
  | {
      kind: MeetingNotificationKind.CANCELLED;
      meetingTitle: string;
      organizer: string;
      meetingTime: string;
    }
  | {
      kind: MeetingNotificationKind.ONGOING;
      meetingTitle: string;
      organizer: string;
      meetingTime: string;
    };

type MeetingNotificationStore = {
  notifications: MeetingNotification[];
  addNotification: (input: AddNotificationInput) => void;
  dismissNotification: (id: string) => void;
  clearNotifications: () => void;
};

let nextNotificationId = 0;

export const useMeetingNotificationStore = create<MeetingNotificationStore>(set => ({
  notifications: [],
  addNotification: input =>
    set(state => ({
      notifications: [
        ...state.notifications,
        match(input)
          .with({kind: MeetingNotificationKind.INVITE}, ({kind, meetingTitle, organizer, meetingTime}) => ({
            kind,
            meetingTitle,
            id: `meeting-notification-${nextNotificationId++}`,
            organizer,
            meetingTime,
          }))
          .with({kind: MeetingNotificationKind.UPDATE}, ({kind, meetingTitle, meetingTime}) => ({
            kind,
            meetingTitle,
            id: `meeting-notification-${nextNotificationId++}`,
            meetingTime,
          }))
          .with({kind: MeetingNotificationKind.CANCELLED}, ({kind, meetingTitle, organizer, meetingTime}) => ({
            kind,
            meetingTitle,
            id: `meeting-notification-${nextNotificationId++}`,
            organizer,
            meetingTime,
          }))
          .with({kind: MeetingNotificationKind.ONGOING}, ({kind, meetingTitle, organizer, meetingTime}) => ({
            kind,
            meetingTitle,
            id: `meeting-notification-${nextNotificationId++}`,
            organizer,
            meetingTime,
          }))
          .exhaustive(),
      ],
    })),
  dismissNotification: id =>
    set(state => ({notifications: state.notifications.filter(notification => notification.id !== id)})),
  clearNotifications: () => set({notifications: []}),
}));
