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
      organizer: 'Organizer',
      meetingTime: 'Jun 01, 09:00 AM',
    });
    addNotification({
      kind: MeetingNotificationKind.UPDATE,
      qualifiedId,
      meetingTitle: 'Updated meeting',
      meetingTime: 'Jun 01, 09:00 AM',
    });
    addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'New meeting',
      organizer: 'Organizer',
      meetingTime: 'Jun 01, 09:00 AM',
    });
    addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId: {id: 'another-meeting-id', domain: 'example.com'},
      meetingTitle: 'Another meeting',
      organizer: 'Organizer',
      meetingTime: 'Jun 01, 09:00 AM',
    });
    addNotification({
      kind: MeetingNotificationKind.UPDATE,
      qualifiedId,
      meetingTitle: 'Updated meeting',
      meetingTime: 'Jun 01, 09:00 AM',
    });
    addNotification({
      kind: MeetingNotificationKind.CANCELLED,
      qualifiedId,
      meetingTitle: 'Canceled meeting',
      organizer: 'Organizer',
      meetingTime: 'Jun 01, 09:00 AM',
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

  it('dismisses only the selected notification by ID', () => {
    const store = useMeetingNotificationStore.getState();
    store.addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      organizer: 'Organizer',
      meetingTime: 'Jun 01, 09:00 AM',
    });
    store.addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      organizer: 'Organizer',
      meetingTime: 'Jun 01, 09:00 AM',
    });
    const [first, second] = useMeetingNotificationStore.getState().notifications;

    store.dismissNotification(first.id);

    expect(useMeetingNotificationStore.getState().notifications).toEqual([second]);
  });

  it('clears all notifications explicitly', () => {
    useMeetingNotificationStore.getState().addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      organizer: 'Organizer',
      meetingTime: 'Jun 01, 09:00 AM',
    });

    useMeetingNotificationStore.getState().clearNotifications();

    expect(useMeetingNotificationStore.getState().notifications).toEqual([]);
  });
});
