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

import type {QualifiedId} from '@wireapp/api-client/lib/user';
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
  qualifiedId: QualifiedId;
  meetingTitle: string;
};

export type MeetingNotification =
  | (MeetingNotificationBase & {
      kind: MeetingNotificationKind.INVITE;
      qualifiedCreator: QualifiedId;
      meetingStartTime: string;
    })
  | (MeetingNotificationBase & {
      kind: MeetingNotificationKind.UPDATE;
      meetingStartTime: string;
    })
  | (MeetingNotificationBase & {
      kind: MeetingNotificationKind.CANCELLED;
      qualifiedCreator: QualifiedId;
      meetingStartTime: string;
    })
  | (MeetingNotificationBase & {
      kind: MeetingNotificationKind.ONGOING;
      qualifiedCreator: QualifiedId;
      meetingStartTime: string;
    });

export type AddNotificationInput =
  | {
      kind: MeetingNotificationKind.INVITE;
      qualifiedId: QualifiedId;
      meetingTitle: string;
      qualifiedCreator: QualifiedId;
      meetingStartTime: string;
    }
  | {
      kind: MeetingNotificationKind.UPDATE;
      qualifiedId: QualifiedId;
      meetingTitle: string;
      meetingStartTime: string;
    }
  | {
      kind: MeetingNotificationKind.CANCELLED;
      qualifiedId: QualifiedId;
      meetingTitle: string;
      qualifiedCreator: QualifiedId;
      meetingStartTime: string;
    }
  | {
      kind: MeetingNotificationKind.ONGOING;
      qualifiedId: QualifiedId;
      meetingTitle: string;
      qualifiedCreator: QualifiedId;
      meetingStartTime: string;
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
          .with(
            {kind: MeetingNotificationKind.INVITE},
            ({kind, qualifiedId, meetingTitle, qualifiedCreator, meetingStartTime}) => ({
              kind,
              qualifiedId,
              meetingTitle,
              id: `meeting-notification-${nextNotificationId++}`,
              qualifiedCreator,
              meetingStartTime,
            }),
          )
          .with({kind: MeetingNotificationKind.UPDATE}, ({kind, qualifiedId, meetingTitle, meetingStartTime}) => ({
            kind,
            qualifiedId,
            meetingTitle,
            id: `meeting-notification-${nextNotificationId++}`,
            meetingStartTime,
          }))
          .with(
            {kind: MeetingNotificationKind.CANCELLED},
            ({kind, qualifiedId, meetingTitle, qualifiedCreator, meetingStartTime}) => ({
              kind,
              qualifiedId,
              meetingTitle,
              id: `meeting-notification-${nextNotificationId++}`,
              qualifiedCreator,
              meetingStartTime,
            }),
          )
          .with(
            {kind: MeetingNotificationKind.ONGOING},
            ({kind, qualifiedId, meetingTitle, qualifiedCreator, meetingStartTime}) => ({
              kind,
              qualifiedId,
              meetingTitle,
              id: `meeting-notification-${nextNotificationId++}`,
              qualifiedCreator,
              meetingStartTime,
            }),
          )
          .exhaustive(),
      ],
    })),
  dismissNotification: id =>
    set(state => ({notifications: state.notifications.filter(notification => notification.id !== id)})),
  clearNotifications: () => {
    nextNotificationId = 0;
    set({notifications: []});
  },
}));
