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
};

export const createMeetingNotificationEventHandlers = ({
  getMeetingSeries,
  addNotification,
  removeMeetingByQualifiedId,
  logger,
}: MeetingNotificationEventHandlersDependencies): MeetingNotificationEventHandlers => {
  const getMeeting = (meetingId: QualifiedId) =>
    getMeetingSeries().find(meeting => matchQualifiedIds(meeting.qualified_id, meetingId));

  const addNotificationForMeeting = (meetingId: QualifiedId, kind: MeetingNotificationKind): boolean => {
    const meeting = getMeeting(meetingId);
    if (!meeting) {
      logger.warn('Skipping meeting notification because the meeting is missing', {kind, meetingId});
      return false;
    }

    const notificationBase = {
      meetingTitle: meeting.title,
      meetingStartTime: meeting.series_start_date,
      qualifiedId: meeting.qualified_id,
    };

    match(kind)
      .with(MeetingNotificationKind.UPDATE, kind => {
        addNotification({...notificationBase, kind});
      })
      .with(MeetingNotificationKind.INVITE, kind => {
        addNotification({
          ...notificationBase,
          kind,
          qualifiedCreator: meeting.qualified_creator,
        });
      })
      .with(MeetingNotificationKind.CANCELLED, kind => {
        addNotification({
          ...notificationBase,
          kind,
          qualifiedCreator: meeting.qualified_creator,
        });
      })
      .with(MeetingNotificationKind.ONGOING, kind => {
        addNotification({
          ...notificationBase,
          kind,
          qualifiedCreator: meeting.qualified_creator,
        });
      })
      .exhaustive();

    return true;
  };

  return {
    onMeetingCreated: meetingId => addNotificationForMeeting(meetingId, MeetingNotificationKind.INVITE),
    onMeetingUpdated: meetingId => addNotificationForMeeting(meetingId, MeetingNotificationKind.UPDATE),
    onMeetingDeleted: meetingId => {
      if (addNotificationForMeeting(meetingId, MeetingNotificationKind.CANCELLED)) {
        removeMeetingByQualifiedId(meetingId);
      }
    },
  };
};
