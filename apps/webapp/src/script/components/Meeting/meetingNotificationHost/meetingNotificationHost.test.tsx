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

import { fireEvent, render, screen } from "@testing-library/react";
import { ThemeProvider } from "@wireapp/react-ui-kit";

import {
  MeetingNotificationKind,
  useMeetingNotificationStore
} from "../meetingNotificationStore/meetingNotificationStore";
import { MeetingNotificationHost } from "./meetingNotificationHost";

jest.mock('Util/localizerUtil', () => ({
  translate: (key: string) => key,
}));

const renderHost = (target: HTMLElement | null = document.getElementById('wire-main')) =>
  render(
    <ThemeProvider>
      <MeetingNotificationHost targetElement={target} />
    </ThemeProvider>,
  );

describe('MeetingNotificationHost', () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="wire-main"></div>';
    useMeetingNotificationStore.getState().clearNotifications();
  });

  it('renders nothing when there are no notifications', () => {
    renderHost();

    expect(screen.queryByTestId('meeting-notification-host')).not.toBeInTheDocument();
  });

  it('shows the active card count in the collapsed header', () => {
    useMeetingNotificationStore
      .getState()
      .addNotification({kind: MeetingNotificationKind.CANCELLED, meetingTitle: 'Canceled', organizer: 'Organizer', meetingTime: 'Jun 01, 09:00 AM'});
    useMeetingNotificationStore
      .getState()
      .addNotification({kind: MeetingNotificationKind.UPDATE, meetingTitle: 'Updated', meetingTime: 'Jun 01, 09:00 AM'});
    useMeetingNotificationStore
      .getState()
      .addNotification({kind: MeetingNotificationKind.INVITE, meetingTitle: 'Invited', organizer: 'Organizer', meetingTime: 'Jun 01, 09:00 AM'});

    renderHost();

    expect(screen.getByText('meetings.notifications.total')).toBeInTheDocument();
    expect(screen.queryByText('meetings.notifications.title')).not.toBeInTheDocument();
  });

  it('dismisses all notifications from the collapsed view', () => {
    useMeetingNotificationStore.getState().addNotification({kind: MeetingNotificationKind.INVITE, meetingTitle: 'One', organizer: 'Organizer', meetingTime: 'Jun 01, 09:00 AM'});

    renderHost();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.dismissAll'}));

    expect(screen.queryByTestId('meeting-notification-host')).not.toBeInTheDocument();
  });

  it('expands to individual cards and dismisses only the selected card', () => {
    const {addNotification} = useMeetingNotificationStore.getState();
    addNotification({kind: MeetingNotificationKind.INVITE, meetingTitle: 'One', organizer: 'Organizer', meetingTime: 'Jun 01, 09:00 AM'});
    addNotification({kind: MeetingNotificationKind.INVITE, meetingTitle: 'Two', organizer: 'Organizer', meetingTime: 'Jun 01, 09:00 AM'});
    addNotification({kind: MeetingNotificationKind.INVITE, meetingTitle: 'Three', organizer: 'Organizer', meetingTime: 'Jun 01, 09:00 AM'});
    addNotification({kind: MeetingNotificationKind.INVITE, meetingTitle: 'Four', organizer: 'Organizer', meetingTime: 'Jun 01, 09:00 AM'});
    addNotification({kind: MeetingNotificationKind.UPDATE, meetingTitle: 'Updated', meetingTime: 'Jun 01, 09:00 AM'});

    renderHost();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.expand'}));

    expect(screen.getAllByRole('status')).toHaveLength(5);
    expect(screen.getByTestId('meeting-notification-list')).toHaveStyle({overflowY: 'auto'});
    fireEvent.click(screen.getAllByRole('button', {name: 'meetings.notifications.dismiss'})[0]);
    expect(screen.getAllByRole('status')).toHaveLength(4);
    expect(screen.getAllByText('meetings.notifications.title')).toHaveLength(4);
  });

  it('dismisses all cards and collapse preserves cards', () => {
    useMeetingNotificationStore
      .getState()
      .addNotification({kind: MeetingNotificationKind.INVITE, meetingTitle: 'Meeting', organizer: 'Organizer', meetingTime: 'Jun 01, 09:00 AM'});

    renderHost();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.expand'}));
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.collapse'}));
    expect(screen.getByText('meetings.notifications.total')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.expand'}));
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.dismissAll'}));

    expect(screen.queryByTestId('meeting-notification-host')).not.toBeInTheDocument();
  });

  it('moves the panel to the current route target without a new notification', () => {
    document.body.innerHTML = '<div id="wire-main"><div id="conversations"></div></div>';
    useMeetingNotificationStore
      .getState()
      .addNotification({kind: MeetingNotificationKind.INVITE, meetingTitle: 'Meeting', organizer: 'Organizer', meetingTime: 'Jun 01, 09:00 AM'});

    const {rerender} = renderHost(document.getElementById('conversations'));
    const conversations = document.getElementById('conversations');
    expect(conversations).toContainElement(screen.getByTestId('meeting-notification-host'));

    conversations?.remove();
    rerender(
      <ThemeProvider>
        <MeetingNotificationHost targetElement={document.getElementById('wire-main')} />
      </ThemeProvider>,
    );

    expect(document.getElementById('wire-main')).toContainElement(screen.getByTestId('meeting-notification-host'));
  });
});
