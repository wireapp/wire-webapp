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

import {matchQualifiedIds} from 'Util/qualifiedId';

export enum MeetingNotificationKind {
  INVITE = 'invite',
  UPDATE = 'update',
  CANCELLED = 'cancelled',
  ONGOING = 'ongoing',
}

type MeetingNotificationBase = {
  qualifiedId: QualifiedId;
  meetingTitle: string;
  meetingStartTime: string;
};

export type AddNotificationInput = MeetingNotificationBase &
  (
    | {
        kind: MeetingNotificationKind.INVITE;
        qualifiedCreator: QualifiedId;
      }
    | {
        kind: MeetingNotificationKind.UPDATE;
      }
    | {
        kind: MeetingNotificationKind.CANCELLED;
        qualifiedCreator: QualifiedId;
      }
    | {
        kind: MeetingNotificationKind.ONGOING;
        qualifiedCreator: QualifiedId;
      }
  );

export type MeetingNotification = AddNotificationInput & {id: string};

type MeetingNotificationStore = {
  notifications: MeetingNotification[];
  isExpanded: boolean;
  addNotification: (input: AddNotificationInput) => void;
  dismissNotification: (id: string) => void;
  dismissNotificationsForMeeting: (meetingId: QualifiedId, kinds?: readonly MeetingNotificationKind[]) => void;
  clearNotifications: () => void;
  setIsExpanded: (isExpanded: boolean) => void;
};

let nextNotificationId = 0;

export const useMeetingNotificationStore = create<MeetingNotificationStore>(set => ({
  notifications: [],
  isExpanded: false,
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
    set(state => {
      const notifications = state.notifications.filter(notification => notification.id !== id);

      return {
        notifications,
        ...(state.notifications.length > 0 && notifications.length === 0 ? {isExpanded: false} : {}),
      };
    }),
  dismissNotificationsForMeeting: (meetingId, kinds) =>
    set(state => {
      const notifications = state.notifications.filter(notification => {
        if (!matchQualifiedIds(notification.qualifiedId, meetingId)) {
          return true;
        }

        return kinds !== undefined && !kinds.includes(notification.kind);
      });

      return {
        notifications,
        ...(state.notifications.length > 0 && notifications.length === 0 ? {isExpanded: false} : {}),
      };
    }),
  clearNotifications: () => {
    nextNotificationId = 0;
    set({notifications: [], isExpanded: false});
  },
  setIsExpanded: isExpanded => set({isExpanded}),
}));
