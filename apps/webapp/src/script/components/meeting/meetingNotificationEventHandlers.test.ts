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
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';

import {
  type AddNotificationInput,
  MeetingNotificationKind,
} from 'Components/meeting/meetingNotificationStore/meetingNotificationStore';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {matchQualifiedIds} from 'Util/qualifiedId';

import {createMeetingNotificationEventHandlers} from './meetingNotificationEventHandlers';

const meetingId: QualifiedId = {id: 'meeting-id', domain: 'example.com'};
const creatorId: QualifiedId = {id: 'creator-id', domain: 'example.com'};
const conversationId: QualifiedId = {id: 'conversation-id', domain: 'example.com'};
const wallClock = createDeterministicWallClock({
  initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T12:00:00.000Z'),
});

const meetingSeries: MeetingSeries = {
  conversation_id: '',
  recurrence: 'doesNotRepeat',
  duration_ms: 60 * 60 * 1000,
  qualified_conversation: conversationId,
  qualified_creator: creatorId,
  qualified_id: meetingId,
  series_end_date: '2026-06-01T14:00:00.000Z',
  series_start_date: '2026-06-01T13:00:00.000Z',
  title: 'Weekly sync',
  tzid: 'Europe/Berlin',
};

describe('createMeetingNotificationEventHandlers', () => {
  const dismissNotificationsFromList = (
    notifications: AddNotificationInput[],
    meetingId: QualifiedId,
    kinds?: readonly MeetingNotificationKind[],
  ) => {
    for (let index = notifications.length - 1; index >= 0; index -= 1) {
      const notification = notifications[index];
      if (!matchQualifiedIds(notification.qualifiedId, meetingId)) {
        continue;
      }

      if (kinds === undefined || kinds.includes(notification.kind)) {
        notifications.splice(index, 1);
      }
    }
  };

  const createHandlers = ({
    getMeetingSeries = () => [meetingSeries],
    activeWallClock = wallClock,
    notifications = [] as AddNotificationInput[],
    dismissedMeetings = [] as Array<{meetingId: QualifiedId; kinds?: readonly MeetingNotificationKind[]}>,
    warnings = [] as Array<{message: string; context?: unknown}>,
  } = {}) =>
    createMeetingNotificationEventHandlers({
      getMeetingSeries,
      wallClock: activeWallClock,
      addNotification: notification => {
        notifications.push(notification);
      },
      dismissNotificationsForMeeting: (meetingId, kinds) => {
        dismissedMeetings.push({meetingId, kinds});
        dismissNotificationsFromList(notifications, meetingId, kinds);
      },
      logger: {
        warn: (message, context) => {
          warnings.push({message, context});
        },
      },
    });

  it('creates meeting notifications from the current meeting series snapshot', () => {
    const notifications: AddNotificationInput[] = [];
    const dismissedMeetings: Array<{meetingId: QualifiedId; kinds?: readonly MeetingNotificationKind[]}> = [];
    const warnings: Array<{message: string; context?: unknown}> = [];

    const {notifyUpdate, onMeetingCancelled} = createHandlers({notifications, dismissedMeetings, warnings});

    notifyUpdate(meetingSeries);
    notifyUpdate(meetingSeries);
    onMeetingCancelled(meetingId);

    expect(notifications).toEqual([
      {
        kind: MeetingNotificationKind.CANCELLED,
        meetingStartTime: meetingSeries.series_start_date,
        meetingTitle: meetingSeries.title,
        qualifiedCreator: meetingSeries.qualified_creator,
        qualifiedId: meetingSeries.qualified_id,
      },
    ]);

    expect(dismissedMeetings).toEqual([
      {meetingId, kinds: expect.arrayContaining([MeetingNotificationKind.UPDATE])},
      {meetingId, kinds: [MeetingNotificationKind.CANCELLED]},
    ]);
    expect(warnings).toEqual([]);
  });

  it('warns and queues notification creation when a meeting is missing', () => {
    const notifications: AddNotificationInput[] = [];
    const warnings: Array<{message: string; context?: unknown}> = [];

    const {onMeetingCancelled} = createHandlers({
      getMeetingSeries: () => [],
      notifications,
      warnings,
    });

    onMeetingCancelled(meetingId);

    expect(notifications).toEqual([]);
    expect(warnings).toEqual([
      {
        message: 'meeting notification pending because the meeting is not in the store yet',
        context: {
          kind: MeetingNotificationKind.CANCELLED,
          meetingId,
        },
      },
    ]);
  });

  it('notifies using the meeting passed by the successful sync', () => {
    const notifications: AddNotificationInput[] = [];
    const {notifyUpdate} = createHandlers({getMeetingSeries: () => [], notifications});

    notifyUpdate({...meetingSeries, title: 'Fresh title'});

    expect(notifications).toEqual([
      expect.objectContaining({kind: MeetingNotificationKind.UPDATE, meetingTitle: 'Fresh title'}),
    ]);
  });

  it('notifies with INVITE on first change and UPDATE on subsequent changes for the same meeting', () => {
    const notifications: AddNotificationInput[] = [];

    const {notifyMeetingChange} = createHandlers({notifications});

    notifyMeetingChange(meetingSeries);
    notifyMeetingChange(meetingSeries);

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
        qualifiedCreator: meetingSeries.qualified_creator,
        qualifiedId: meetingSeries.qualified_id,
      },
    ]);
  });

  it('notifies with ONGOING when the first notification arrives during the meeting', () => {
    const notifications: AddNotificationInput[] = [];
    const activeMeetingWallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T13:30:00.000Z'),
    });

    const {notifyMeetingChange} = createHandlers({notifications, activeWallClock: activeMeetingWallClock});

    notifyMeetingChange(meetingSeries);

    expect(notifications).toEqual([
      {
        kind: MeetingNotificationKind.ONGOING,
        meetingStartTime: meetingSeries.series_start_date,
        meetingTitle: meetingSeries.title,
        qualifiedCreator: meetingSeries.qualified_creator,
        qualifiedId: meetingSeries.qualified_id,
      },
    ]);
  });

  it('keeps an active meeting ongoing on subsequent notifications', () => {
    const notifications: AddNotificationInput[] = [];
    const activeMeetingWallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T13:30:00.000Z'),
    });

    const {notifyMeetingChange} = createHandlers({notifications, activeWallClock: activeMeetingWallClock});

    notifyMeetingChange(meetingSeries);
    notifyMeetingChange(meetingSeries);

    expect(notifications.map(notification => notification.kind)).toEqual([
      MeetingNotificationKind.ONGOING,
      MeetingNotificationKind.ONGOING,
    ]);
  });

  it('notifies with ONGOING for the current instance of a recurring meeting', () => {
    const notifications: AddNotificationInput[] = [];
    const activeMeetingWallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-08T10:30:00.000Z'),
    });
    const recurringMeeting = {
      ...meetingSeries,
      recurrence: 'weekly' as const,
      series_start_date: '2026-06-01T10:00:00.000Z',
      series_end_date: '2026-06-01T11:00:00.000Z',
    };

    const {notifyMeetingChange} = createHandlers({
      notifications,
      activeWallClock: activeMeetingWallClock,
    });

    notifyMeetingChange(recurringMeeting);

    expect(notifications[0]?.kind).toBe(MeetingNotificationKind.ONGOING);
  });

  it('keeps a one-shot meeting ongoing at its exact end time', () => {
    const notifications: AddNotificationInput[] = [];
    const activeMeetingWallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T14:00:00.000Z'),
    });

    const {notifyMeetingChange} = createHandlers({
      notifications,
      activeWallClock: activeMeetingWallClock,
    });

    notifyMeetingChange(meetingSeries);

    expect(notifications[0]?.kind).toBe(MeetingNotificationKind.ONGOING);
  });

  it('notifies with INVITE when the first notification arrives after the meeting ends', () => {
    const notifications: AddNotificationInput[] = [];
    const activeMeetingWallClock = createDeterministicWallClock({
      initialCurrentTimestampInMilliseconds: Date.parse('2026-06-01T14:00:00.001Z'),
    });

    const {notifyMeetingChange} = createHandlers({
      notifications,
      activeWallClock: activeMeetingWallClock,
    });

    notifyMeetingChange(meetingSeries);

    expect(notifications[0]?.kind).toBe(MeetingNotificationKind.INVITE);
  });

  it('logs invalid meeting dates and does not create a notification', () => {
    const notifications: AddNotificationInput[] = [];
    const warnings: Array<{message: string; context?: unknown}> = [];
    const invalidMeeting = {...meetingSeries, series_start_date: 'invalid-start'};
    const {notifyMeetingChange} = createHandlers({notifications, warnings});

    notifyMeetingChange(invalidMeeting);

    expect(notifications).toEqual([]);
    expect(warnings).toEqual([
      {
        message: 'meeting notification received with invalid meeting dates',
        context: {
          meetingId: meetingSeries.qualified_id,
          meetingStartTime: 'invalid-start',
          meetingEndTime: meetingSeries.series_end_date,
        },
      },
    ]);
  });

  it('creates a new invitation when the user is removed and added again', () => {
    const notifications: AddNotificationInput[] = [];
    const {notifyMeetingChange, onMeetingCancelled} = createHandlers({notifications});

    notifyMeetingChange(meetingSeries);
    onMeetingCancelled(meetingId);
    notifyMeetingChange(meetingSeries);

    expect(notifications.map(notification => notification.kind)).toEqual([
      MeetingNotificationKind.CANCELLED,
      MeetingNotificationKind.INVITE,
    ]);
  });

  it('dismisses stale notifications before creating a cancellation for involuntary self-removal', () => {
    const dismissedMeetings: Array<{meetingId: QualifiedId; kinds?: readonly MeetingNotificationKind[]}> = [];
    const notifications: AddNotificationInput[] = [];
    const {onMeetingCancelled} = createHandlers({notifications, dismissedMeetings});

    onMeetingCancelled(meetingId);

    expect(dismissedMeetings).toEqual([
      {
        meetingId,
        kinds: [MeetingNotificationKind.UPDATE, MeetingNotificationKind.INVITE, MeetingNotificationKind.ONGOING],
      },
      {
        meetingId,
        kinds: [MeetingNotificationKind.CANCELLED],
      },
    ]);
    expect(notifications).toEqual([
      {
        kind: MeetingNotificationKind.CANCELLED,
        meetingStartTime: meetingSeries.series_start_date,
        meetingTitle: meetingSeries.title,
        qualifiedCreator: meetingSeries.qualified_creator,
        qualifiedId: meetingSeries.qualified_id,
      },
    ]);
  });

  it('dismisses stale notifications without creating a cancellation when notify is false', () => {
    const dismissedMeetings: Array<{meetingId: QualifiedId; kinds?: readonly MeetingNotificationKind[]}> = [];
    const notifications: AddNotificationInput[] = [];
    const {notifyUpdate, onMeetingCancelled} = createHandlers({notifications, dismissedMeetings});

    notifyUpdate(meetingSeries);
    onMeetingCancelled(meetingId, {notify: false});

    expect(dismissedMeetings).toEqual([
      {
        meetingId,
        kinds: [MeetingNotificationKind.UPDATE, MeetingNotificationKind.INVITE, MeetingNotificationKind.ONGOING],
      },
      {
        meetingId,
        kinds: [MeetingNotificationKind.CANCELLED],
      },
    ]);
    expect(notifications).toEqual([]);
  });

  it('creates only one cancellation notification when cancelled twice', () => {
    const notifications: AddNotificationInput[] = [];
    const dismissedMeetings: Array<{meetingId: QualifiedId; kinds?: readonly MeetingNotificationKind[]}> = [];
    const {onMeetingCancelled} = createMeetingNotificationEventHandlers({
      getMeetingSeries: () => [meetingSeries],
      wallClock,
      addNotification: notification => {
        notifications.push(notification);
      },
      dismissNotificationsForMeeting: (dismissedMeetingId, kinds) => {
        dismissedMeetings.push({meetingId: dismissedMeetingId, kinds});
        dismissNotificationsFromList(notifications, dismissedMeetingId, kinds);
      },
      logger: {warn: jest.fn()},
    });

    onMeetingCancelled(meetingId);
    onMeetingCancelled(meetingId);

    expect(notifications).toEqual([
      expect.objectContaining({kind: MeetingNotificationKind.CANCELLED, qualifiedId: meetingId}),
    ]);
    expect(dismissedMeetings).toEqual([
      {
        meetingId,
        kinds: [MeetingNotificationKind.UPDATE, MeetingNotificationKind.INVITE, MeetingNotificationKind.ONGOING],
      },
      {
        meetingId,
        kinds: [MeetingNotificationKind.CANCELLED],
      },
    ]);
  });

  it('retries pending cancellations with the full cancellation path', () => {
    const notifications: AddNotificationInput[] = [];
    const dismissedMeetings: Array<{meetingId: QualifiedId; kinds?: readonly MeetingNotificationKind[]}> = [];
    let meetingSeriesSnapshot: MeetingSeries[] = [];

    const {onMeetingCancelled, retryPendingNotifications} = createHandlers({
      getMeetingSeries: () => meetingSeriesSnapshot,
      notifications,
      dismissedMeetings,
    });

    onMeetingCancelled(meetingId);
    expect(dismissedMeetings).toEqual([
      {
        meetingId,
        kinds: [MeetingNotificationKind.UPDATE, MeetingNotificationKind.INVITE, MeetingNotificationKind.ONGOING],
      },
      {
        meetingId,
        kinds: [MeetingNotificationKind.CANCELLED],
      },
    ]);
    expect(notifications).toEqual([]);

    meetingSeriesSnapshot = [meetingSeries];
    retryPendingNotifications();

    expect(dismissedMeetings).toEqual([
      {
        meetingId,
        kinds: [MeetingNotificationKind.UPDATE, MeetingNotificationKind.INVITE, MeetingNotificationKind.ONGOING],
      },
      {
        meetingId,
        kinds: [MeetingNotificationKind.CANCELLED],
      },
      {
        meetingId,
        kinds: [MeetingNotificationKind.UPDATE, MeetingNotificationKind.INVITE, MeetingNotificationKind.ONGOING],
      },
      {
        meetingId,
        kinds: [MeetingNotificationKind.CANCELLED],
      },
    ]);
    expect(notifications).toEqual([
      expect.objectContaining({kind: MeetingNotificationKind.CANCELLED, qualifiedId: meetingId}),
    ]);
  });
});
