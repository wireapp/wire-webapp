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
} from 'Components/Meeting/meetingNotificationStore/meetingNotificationStore';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';
import {matchQualifiedIds} from 'Util/qualifiedId';

type MeetingNotificationLogger = {
  warn: (message: string, context?: unknown) => void;
};

export type MeetingNotificationEventHandlersDependencies = {
  getMeetingSeries: () => readonly MeetingSeries[];
  addNotification: (input: AddNotificationInput) => void;
  removeMeetingByQualifiedId: (meetingId: QualifiedId) => void;
  logger: MeetingNotificationLogger;
};

export type MeetingNotificationEventHandlers = {
  onMeetingCreated: (meetingId: QualifiedId) => void;
  onMeetingUpdated: (meetingId: QualifiedId) => void;
  onMeetingDeleted: (meetingId: QualifiedId) => void;
  /** Retries notifications that couldn't be sent because the meeting wasn't in the store yet. */
  retryPendingNotifications: () => void;
};

export const createMeetingNotificationEventHandlers = ({
  getMeetingSeries,
  addNotification,
  removeMeetingByQualifiedId,
  logger,
}: MeetingNotificationEventHandlersDependencies): MeetingNotificationEventHandlers => {
  const getMeeting = (meetingId: QualifiedId) =>
    getMeetingSeries().find(meeting => matchQualifiedIds(meeting.qualified_id, meetingId));

  // MEETING.CREATED/DELETED amplify events only carry the meetingId and can fire before the
  // meeting store has synced, so a lookup miss is retried once the store updates rather than dropped.
  const pending = new Map<string, {meetingId: QualifiedId; kind: MeetingNotificationKind}>();
  const pendingKey = (meetingId: QualifiedId) => `${meetingId.domain}@${meetingId.id}`;

  const notifyForMeeting = (meetingId: QualifiedId, kind: MeetingNotificationKind, meeting: MeetingSeries) => {
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

  const addNotificationForMeeting = (meetingId: QualifiedId, kind: MeetingNotificationKind): boolean => {
    const meeting = getMeeting(meetingId);
    if (!meeting) {
      logger.warn('Meeting notification pending because the meeting is not in the store yet', {kind, meetingId});
      pending.set(pendingKey(meetingId), {meetingId, kind});
      return false;
    }

    notifyForMeeting(meetingId, kind, meeting);
    return true;
  };

  const retryPendingNotifications = () => {
    for (const [key, {meetingId, kind}] of pending) {
      const meeting = getMeeting(meetingId);
      if (!meeting) {
        continue;
      }

      notifyForMeeting(meetingId, kind, meeting);
      pending.delete(key);
      if (kind === MeetingNotificationKind.CANCELLED) {
        removeMeetingByQualifiedId(meetingId);
      }
    }
  };

  return {
    onMeetingCreated: meetingId => {
      addNotificationForMeeting(meetingId, MeetingNotificationKind.INVITE);
    },
    onMeetingUpdated: meetingId => {
      addNotificationForMeeting(meetingId, MeetingNotificationKind.UPDATE);
    },
    onMeetingDeleted: meetingId => {
      if (addNotificationForMeeting(meetingId, MeetingNotificationKind.CANCELLED)) {
        removeMeetingByQualifiedId(meetingId);
      }
    },
    retryPendingNotifications,
  };
};
