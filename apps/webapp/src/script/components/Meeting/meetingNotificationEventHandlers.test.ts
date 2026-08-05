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

import {
  type AddNotificationInput,
  MeetingNotificationKind,
} from 'Components/Meeting/meetingNotificationStore/meetingNotificationStore';
import type {MeetingSeries} from 'Components/Meeting/types/meetingSeries';

import {createMeetingNotificationEventHandlers} from './meetingNotificationEventHandlers';

const meetingId: QualifiedId = {id: 'meeting-id', domain: 'example.com'};
const creatorId: QualifiedId = {id: 'creator-id', domain: 'example.com'};
const conversationId: QualifiedId = {id: 'conversation-id', domain: 'example.com'};

const meetingSeries: MeetingSeries = {
  conversation_id: '',
  recurrence: 'weekly',
  duration_ms: 60 * 60 * 1000,
  qualified_conversation: conversationId,
  qualified_creator: creatorId,
  qualified_id: meetingId,
  series_end_date: '2026-06-01T11:00:00.000Z',
  series_start_date: '2026-06-01T10:00:00.000Z',
  title: 'Weekly sync',
};

describe('createMeetingNotificationEventHandlers', () => {
  it('creates meeting notifications from the current meeting series snapshot', () => {
    const notifications: AddNotificationInput[] = [];
    const removedMeetingIds: QualifiedId[] = [];
    const warnings: Array<{message: string; context?: unknown}> = [];

    const {onMeetingCreated, onMeetingUpdated, onMeetingDeleted} = createMeetingNotificationEventHandlers({
      getMeetingSeries: () => [meetingSeries],
      addNotification: notification => {
        notifications.push(notification);
      },
      removeMeetingByQualifiedId: id => {
        removedMeetingIds.push(id);
      },
      logger: {
        warn: (message, context) => {
          warnings.push({message, context});
        },
      },
    });

    onMeetingCreated(meetingId);
    onMeetingUpdated(meetingId);
    onMeetingDeleted(meetingId);

    expect(notifications).toEqual([
      {
        kind: MeetingNotificationKind.INVITE,
        meetingStartTime: meetingSeries.series_start_date,
        meetingTitle: meetingSeries.title,
        qualifiedCreator: meetingSeries.qualified_creator,
        qualifiedId: meetingSeries.qualified_id,
      },
      {
        kind: MeetingNotificationKind.UPDATE,
        meetingStartTime: meetingSeries.series_start_date,
        meetingTitle: meetingSeries.title,
        qualifiedId: meetingSeries.qualified_id,
      },
      {
        kind: MeetingNotificationKind.CANCELLED,
        meetingStartTime: meetingSeries.series_start_date,
        meetingTitle: meetingSeries.title,
        qualifiedCreator: meetingSeries.qualified_creator,
        qualifiedId: meetingSeries.qualified_id,
      },
    ]);

    expect(removedMeetingIds).toEqual([meetingId]);
    expect(warnings).toEqual([]);
  });

  it('warns and queues notification creation when a meeting is missing', () => {
    const notifications: AddNotificationInput[] = [];
    const removedMeetingIds: QualifiedId[] = [];
    const warnings: Array<{message: string; context?: unknown}> = [];

    const {onMeetingCreated, onMeetingDeleted} = createMeetingNotificationEventHandlers({
      getMeetingSeries: () => [],
      addNotification: notification => {
        notifications.push(notification);
      },
      removeMeetingByQualifiedId: id => {
        removedMeetingIds.push(id);
      },
      logger: {
        warn: (message, context) => {
          warnings.push({message, context});
        },
      },
    });

    onMeetingCreated(meetingId);
    onMeetingDeleted(meetingId);

    expect(notifications).toEqual([]);
    expect(removedMeetingIds).toEqual([]);
    expect(warnings).toEqual([
      {
        message: 'Meeting notification pending because the meeting is not in the store yet',
        context: {
          kind: MeetingNotificationKind.INVITE,
          meetingId,
        },
      },
      {
        message: 'Meeting notification pending because the meeting is not in the store yet',
        context: {
          kind: MeetingNotificationKind.CANCELLED,
          meetingId,
        },
      },
    ]);
  });
});
