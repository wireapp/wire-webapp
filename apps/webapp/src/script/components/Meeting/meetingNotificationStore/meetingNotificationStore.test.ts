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

import {useMeetingNotificationStore} from './meetingNotificationStore';

describe('useMeetingNotificationStore', () => {
  beforeEach(() => {
    useMeetingNotificationStore.getState().clearNotifications();
  });

  it('creates and merges each notification variant independently', () => {
    const {addNotification} = useMeetingNotificationStore.getState();

    addNotification({kind: 'cancelled', meetingTitle: 'Canceled meeting'});
    addNotification({kind: 'update', meetingTitle: 'Updated meeting'});
    addNotification({kind: 'invite', meetingTitle: 'New meeting'});
    addNotification({kind: 'invite', meetingTitle: 'Another meeting'});
    addNotification({kind: 'update', meetingTitle: 'Updated meeting'});
    addNotification({kind: 'cancelled', meetingTitle: 'Canceled meeting'});

    expect(useMeetingNotificationStore.getState().notifications).toEqual([
      {kind: 'invite', count: 2, meetingTitles: ['New meeting', 'Another meeting']},
      {kind: 'update', count: 2, meetingTitles: ['Updated meeting']},
      {kind: 'cancelled', count: 2, meetingTitles: ['Canceled meeting']},
    ]);
  });

  it('dismisses only the selected variant and does not expire notifications', () => {
    useMeetingNotificationStore.getState().addNotification({kind: 'invite', meetingTitle: 'Meeting'});
    useMeetingNotificationStore.getState().addNotification({kind: 'update', meetingTitle: 'Meeting'});

    useMeetingNotificationStore.getState().dismissNotification('invite');

    expect(useMeetingNotificationStore.getState().notifications).toEqual([
      {kind: 'update', count: 1, meetingTitles: ['Meeting']},
    ]);
  });

  it('clears all notifications explicitly', () => {
    useMeetingNotificationStore.getState().addNotification({kind: 'invite', meetingTitle: 'Meeting'});

    useMeetingNotificationStore.getState().clearNotifications();

    expect(useMeetingNotificationStore.getState().notifications).toEqual([]);
  });
});
