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

import {fireEvent, render, screen} from '@testing-library/react';

import {useMeetingNotificationStore} from '../meetingNotificationStore/meetingNotificationStore';
import {MeetingNotificationHost} from './meetingNotificationHost';

describe('MeetingNotificationHost', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="conversations"></div>';
    useMeetingNotificationStore.getState().clearNotifications();
  });

  it('renders active variants in stable vertical order', () => {
    useMeetingNotificationStore.getState().addNotification({kind: 'cancelled', meetingTitle: 'Canceled'});
    useMeetingNotificationStore.getState().addNotification({kind: 'update', meetingTitle: 'Updated'});
    useMeetingNotificationStore.getState().addNotification({kind: 'invite', meetingTitle: 'Invited'});

    render(<MeetingNotificationHost />);

    expect(screen.getByText('Invitation: Invited')).toBeInTheDocument();
    expect(screen.getByText('Update: Updated')).toBeInTheDocument();
    expect(screen.getByText('Canceled: Canceled')).toBeInTheDocument();
    expect(screen.getByTestId('meeting-notification-host')).toHaveStyle({flexDirection: 'column'});
  });

  it('supports plural and overflow copy, and dismisses only one card', () => {
    const {addNotification} = useMeetingNotificationStore.getState();
    addNotification({kind: 'invite', meetingTitle: 'One'});
    addNotification({kind: 'invite', meetingTitle: 'Two'});
    addNotification({kind: 'invite', meetingTitle: 'Three'});
    addNotification({kind: 'invite', meetingTitle: 'Four'});
    addNotification({kind: 'update', meetingTitle: 'Updated'});

    render(<MeetingNotificationHost />);

    expect(screen.getByText('Invite: 4 New Meetings')).toBeInTheDocument();
    expect(screen.getByText('One, Two, Three +1 more')).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', {name: 'Dismiss'})[0]);
    expect(screen.queryByText('Invite: 4 New Meetings')).not.toBeInTheDocument();
    expect(screen.getByText('Update: Updated')).toBeInTheDocument();
  });

  it('keeps a card when View is clicked', () => {
    useMeetingNotificationStore.getState().addNotification({kind: 'invite', meetingTitle: 'Meeting'});

    render(<MeetingNotificationHost />);
    fireEvent.click(screen.getByRole('button', {name: 'View'}));

    expect(screen.getByText('Invitation: Meeting')).toBeInTheDocument();
  });
});
