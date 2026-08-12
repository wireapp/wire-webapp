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

import {
  type AddNotificationInput,
  MeetingNotificationKind,
} from 'Components/meeting/meetingNotificationStore/meetingNotificationStore';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {matchQualifiedIds} from 'Util/qualifiedId';

import {toMeetingIdKey} from './utils/toMeetingIdKey';

type MeetingNotificationLogger = {
  warn: (message: string, context?: unknown) => void;
};

export const staleMeetingNotificationKinds = [
  MeetingNotificationKind.UPDATE,
  MeetingNotificationKind.INVITE,
  MeetingNotificationKind.ONGOING,
] as const;

export type MeetingNotificationEventHandlersDependencies = {
  getMeetingSeries: () => readonly MeetingSeries[];
  addNotification: (input: AddNotificationInput) => void;
  dismissNotificationsForMeeting: (meetingId: QualifiedId, kinds?: readonly MeetingNotificationKind[]) => void;
  logger: MeetingNotificationLogger;
};

export type MeetingNotificationEventHandlers = {
  notifyMeetingChange: (meeting: MeetingSeries) => void;
  notifyUpdate: (meeting: MeetingSeries) => void;
  onMeetingCancelled: (meetingId: QualifiedId) => void;
  /** Retries notifications that couldn't be sent because the meeting wasn't in the store yet. */
  retryPendingNotifications: () => void;
};

export const createMeetingNotificationEventHandlers = ({
  getMeetingSeries,
  addNotification,
  dismissNotificationsForMeeting,
  logger,
}: MeetingNotificationEventHandlersDependencies): MeetingNotificationEventHandlers => {
  const getMeeting = (meetingId: QualifiedId) =>
    getMeetingSeries().find(meeting => matchQualifiedIds(meeting.qualified_id, meetingId));

  // Only deleted events can fire before the meeting store has synced.
  const pending = new Map<string, QualifiedId>();
  const notifiedMeetings = new Set<string>();
  const cancelledMeetings = new Set<string>();

  const notifyForMeeting = (kind: MeetingNotificationKind, meeting: MeetingSeries) => {
    const notificationBase = {
      meetingTitle: meeting.title,
      meetingStartTime: meeting.series_start_date,
      qualifiedId: meeting.qualified_id,
    };

    match(kind)
      .with(MeetingNotificationKind.UPDATE, kind => {
        addNotification({...notificationBase, kind});
      })
      .with(
        MeetingNotificationKind.INVITE,
        MeetingNotificationKind.CANCELLED,
        MeetingNotificationKind.ONGOING,
        kind => {
          addNotification({
            ...notificationBase,
            kind,
            qualifiedCreator: meeting.qualified_creator,
          });
        },
      )
      .exhaustive();
  };

  const dismissStaleNotificationsForMeeting = (meetingId: QualifiedId): void => {
    dismissNotificationsForMeeting(meetingId, staleMeetingNotificationKinds);
  };

  const addCancellationNotificationForMeeting = (meetingId: QualifiedId): void => {
    const meetingKey = toMeetingIdKey(meetingId);

    if (cancelledMeetings.has(meetingKey)) {
      pending.delete(meetingKey);
      return;
    }

    const meeting = getMeeting(meetingId);
    if (!meeting) {
      logger.warn('meeting notification pending because the meeting is not in the store yet', {
        kind: MeetingNotificationKind.CANCELLED,
        meetingId,
      });
      pending.set(meetingKey, meetingId);
      return;
    }

    cancelledMeetings.add(meetingKey);
    pending.delete(meetingKey);
    notifyForMeeting(MeetingNotificationKind.CANCELLED, meeting);
  };

  const notifyMeetingCancellation = (meetingId: QualifiedId): void => {
    dismissStaleNotificationsForMeeting(meetingId);
    dismissNotificationsForMeeting(meetingId, [MeetingNotificationKind.CANCELLED]);
    addCancellationNotificationForMeeting(meetingId);
  };

  const retryPendingNotifications = () => {
    for (const [key, meetingId] of pending) {
      const meeting = getMeeting(meetingId);
      if (!meeting) {
        continue;
      }

      notifyMeetingCancellation(meetingId);
      pending.delete(key);
    }
  };

  return {
    notifyMeetingChange: meeting => {
      const meetingKey = toMeetingIdKey(meeting.qualified_id);
      const kind = notifiedMeetings.has(meetingKey) ? MeetingNotificationKind.UPDATE : MeetingNotificationKind.INVITE;
      notifiedMeetings.add(meetingKey);
      notifyForMeeting(kind, meeting);
    },
    notifyUpdate: meeting => notifyForMeeting(MeetingNotificationKind.UPDATE, meeting),
    onMeetingCancelled: meetingId => {
      notifyMeetingCancellation(meetingId);
    },
    retryPendingNotifications,
  };
};
