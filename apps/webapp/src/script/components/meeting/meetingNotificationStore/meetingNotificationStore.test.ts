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

import {MeetingNotificationKind, useMeetingNotificationStore} from './meetingNotificationStore';

const qualifiedId = {id: 'meeting-id', domain: 'example.com'};
const qualifiedCreator = {id: 'creator-id', domain: 'example.com'};
const meetingStartTime = '2026-06-01T09:00:00.000Z';

describe('useMeetingNotificationStore', () => {
  beforeEach(() => {
    useMeetingNotificationStore.getState().clearNotifications();
  });

  it('stores every event independently in arrival order', () => {
    const {addNotification} = useMeetingNotificationStore.getState();

    addNotification({
      kind: MeetingNotificationKind.CANCELLED,
      qualifiedId,
      meetingTitle: 'Canceled meeting',
      qualifiedCreator,
      meetingStartTime,
    });
    addNotification({
      kind: MeetingNotificationKind.UPDATE,
      qualifiedId,
      meetingTitle: 'Updated meeting',
      meetingStartTime,
    });
    addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'New meeting',
      qualifiedCreator,
      meetingStartTime,
    });
    addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId: {id: 'another-meeting-id', domain: 'example.com'},
      meetingTitle: 'Another meeting',
      qualifiedCreator,
      meetingStartTime,
    });
    addNotification({
      kind: MeetingNotificationKind.UPDATE,
      qualifiedId,
      meetingTitle: 'Updated meeting',
      meetingStartTime,
    });
    addNotification({
      kind: MeetingNotificationKind.CANCELLED,
      qualifiedId,
      meetingTitle: 'Canceled meeting',
      qualifiedCreator,
      meetingStartTime,
    });

    expect(useMeetingNotificationStore.getState().notifications).toHaveLength(6);
    expect(
      useMeetingNotificationStore.getState().notifications.map(({kind, qualifiedId: notificationQualifiedId}) => ({
        kind,
        qualifiedId: notificationQualifiedId,
      })),
    ).toEqual([
      {kind: MeetingNotificationKind.CANCELLED, qualifiedId},
      {kind: MeetingNotificationKind.UPDATE, qualifiedId},
      {kind: MeetingNotificationKind.INVITE, qualifiedId},
      {kind: MeetingNotificationKind.INVITE, qualifiedId: {id: 'another-meeting-id', domain: 'example.com'}},
      {kind: MeetingNotificationKind.UPDATE, qualifiedId},
      {kind: MeetingNotificationKind.CANCELLED, qualifiedId},
    ]);
    expect(
      new Set(useMeetingNotificationStore.getState().notifications.map(notification => notification.id)).size,
    ).toBe(6);
  });

  it('stores raw meeting data for formatting at render time', () => {
    useMeetingNotificationStore.getState().addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      qualifiedCreator,
      meetingStartTime,
    });

    expect(useMeetingNotificationStore.getState().notifications[0]).toMatchObject({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      qualifiedCreator,
      meetingStartTime,
    });
    expect(useMeetingNotificationStore.getState().notifications[0]).not.toHaveProperty('organizer');
    expect(useMeetingNotificationStore.getState().notifications[0]).not.toHaveProperty('meetingTime');
  });

  it('stores the discriminated fields for every notification kind', () => {
    const store = useMeetingNotificationStore.getState();

    store.addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Invite meeting',
      qualifiedCreator,
      meetingStartTime,
    });
    store.addNotification({
      kind: MeetingNotificationKind.UPDATE,
      qualifiedId,
      meetingTitle: 'Updated meeting',
      meetingStartTime,
    });
    store.addNotification({
      kind: MeetingNotificationKind.CANCELLED,
      qualifiedId,
      meetingTitle: 'Cancelled meeting',
      qualifiedCreator,
      meetingStartTime,
    });
    store.addNotification({
      kind: MeetingNotificationKind.ONGOING,
      qualifiedId,
      meetingTitle: 'Ongoing meeting',
      qualifiedCreator,
      meetingStartTime,
    });

    expect(useMeetingNotificationStore.getState().notifications).toEqual([
      {
        id: 'meeting-notification-0',
        kind: MeetingNotificationKind.INVITE,
        qualifiedId,
        meetingTitle: 'Invite meeting',
        qualifiedCreator,
        meetingStartTime,
      },
      {
        id: 'meeting-notification-1',
        kind: MeetingNotificationKind.UPDATE,
        qualifiedId,
        meetingTitle: 'Updated meeting',
        meetingStartTime,
      },
      {
        id: 'meeting-notification-2',
        kind: MeetingNotificationKind.CANCELLED,
        qualifiedId,
        meetingTitle: 'Cancelled meeting',
        qualifiedCreator,
        meetingStartTime,
      },
      {
        id: 'meeting-notification-3',
        kind: MeetingNotificationKind.ONGOING,
        qualifiedId,
        meetingTitle: 'Ongoing meeting',
        qualifiedCreator,
        meetingStartTime,
      },
    ]);
  });

  it('dismisses only the selected notification by ID', () => {
    const store = useMeetingNotificationStore.getState();
    store.addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      qualifiedCreator,
      meetingStartTime,
    });
    store.addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      qualifiedCreator,
      meetingStartTime,
    });
    const [first, second] = useMeetingNotificationStore.getState().notifications;

    store.dismissNotification(first.id);

    expect(useMeetingNotificationStore.getState().notifications).toEqual([second]);
  });

  it('resets the expanded state when dismissing the last notification', () => {
    const store = useMeetingNotificationStore.getState();
    store.addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      qualifiedCreator,
      meetingStartTime,
    });
    store.setIsExpanded(true);
    const [notification] = useMeetingNotificationStore.getState().notifications;

    store.dismissNotification(notification.id);

    expect(useMeetingNotificationStore.getState().notifications).toEqual([]);
    expect(useMeetingNotificationStore.getState().isExpanded).toBe(false);
  });

  it('dismisses all matching notifications for a meeting and keeps other meetings untouched', () => {
    const store = useMeetingNotificationStore.getState();
    const otherMeetingId = {id: 'other-meeting-id', domain: 'example.com'};

    store.addNotification({
      kind: MeetingNotificationKind.UPDATE,
      qualifiedId,
      meetingTitle: 'Updated meeting',
      meetingStartTime,
    });
    store.addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Invited meeting',
      qualifiedCreator,
      meetingStartTime,
    });
    store.addNotification({
      kind: MeetingNotificationKind.UPDATE,
      qualifiedId: otherMeetingId,
      meetingTitle: 'Other meeting',
      meetingStartTime,
    });
    store.addNotification({
      kind: MeetingNotificationKind.CANCELLED,
      qualifiedId,
      meetingTitle: 'Cancelled meeting',
      qualifiedCreator,
      meetingStartTime,
    });

    store.dismissNotificationsForMeeting(qualifiedId, [
      MeetingNotificationKind.UPDATE,
      MeetingNotificationKind.INVITE,
      MeetingNotificationKind.ONGOING,
    ]);

    expect(useMeetingNotificationStore.getState().notifications.map(({kind, qualifiedId: id}) => ({kind, id}))).toEqual(
      [
        {kind: MeetingNotificationKind.UPDATE, id: otherMeetingId},
        {kind: MeetingNotificationKind.CANCELLED, id: qualifiedId},
      ],
    );
  });

  it('resets the expanded state when dismissing the last notification for a meeting', () => {
    const store = useMeetingNotificationStore.getState();
    store.addNotification({
      kind: MeetingNotificationKind.UPDATE,
      qualifiedId,
      meetingTitle: 'Updated meeting',
      meetingStartTime,
    });
    store.setIsExpanded(true);

    store.dismissNotificationsForMeeting(qualifiedId, [MeetingNotificationKind.UPDATE]);

    expect(useMeetingNotificationStore.getState().notifications).toEqual([]);
    expect(useMeetingNotificationStore.getState().isExpanded).toBe(false);
  });

  it('clears all notifications explicitly', () => {
    useMeetingNotificationStore.getState().addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      qualifiedCreator,
      meetingStartTime,
    });

    useMeetingNotificationStore.getState().clearNotifications();

    expect(useMeetingNotificationStore.getState().notifications).toEqual([]);
  });

  it('resets notification IDs when clearing notifications', () => {
    const store = useMeetingNotificationStore.getState();
    store.addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      qualifiedCreator,
      meetingStartTime,
    });

    store.clearNotifications();
    store.addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      qualifiedCreator,
      meetingStartTime,
    });

    expect(useMeetingNotificationStore.getState().notifications[0]?.id).toBe('meeting-notification-0');
  });

  it('toggles the expanded state', () => {
    const store = useMeetingNotificationStore.getState();

    expect(useMeetingNotificationStore.getState().isExpanded).toBe(false);

    store.setIsExpanded(true);
    expect(useMeetingNotificationStore.getState().isExpanded).toBe(true);

    store.setIsExpanded(false);
    expect(useMeetingNotificationStore.getState().isExpanded).toBe(false);
  });

  it('resets the expanded state when clearing notifications', () => {
    const store = useMeetingNotificationStore.getState();
    store.setIsExpanded(true);

    store.clearNotifications();

    expect(useMeetingNotificationStore.getState().isExpanded).toBe(false);
  });
});
