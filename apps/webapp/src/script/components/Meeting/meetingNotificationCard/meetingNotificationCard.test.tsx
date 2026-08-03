/*
 * Wire
 * Copyright (C) 2026 Wire Swiss GmbH
 */

import {fireEvent, render, screen} from '@testing-library/react';
import {ThemeProvider} from '@wireapp/react-ui-kit';

import * as Router from '../../../router/Router';

import {MeetingNotificationCard} from './meetingNotificationCard';
import {
  MeetingNotificationKind,
  type MeetingNotification,
} from 'Components/Meeting/meetingNotificationStore/meetingNotificationStore';

jest.mock('Util/localizerUtil', () => ({
  translate: (key: string) => key,
}));

const notificationData = {
  [MeetingNotificationKind.INVITE]: {organizer: 'Kim Dawson', meetingTime: 'Jun 01, 09:00 AM'},
  [MeetingNotificationKind.UPDATE]: {meetingTime: 'Jun 01, 09:00 AM'},
  [MeetingNotificationKind.CANCELLED]: {organizer: 'Kim Dawson', meetingTime: 'Jun 01, 09:00 AM'},
  [MeetingNotificationKind.ONGOING]: {organizer: 'Kim Dawson', meetingTime: 'Jun 01, 09:50 AM'},
} as const;

const renderCard = (card: React.ReactElement) => render(<ThemeProvider>{card}</ThemeProvider>);

describe('MeetingNotificationCard', () => {
  beforeEach(() => {
    jest.spyOn(Router, 'navigate').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const notifications = [
    {
      id: 'notification-invite',
      kind: MeetingNotificationKind.INVITE,
      meetingTitle: 'Meeting Title',
      organizer: 'Kim Dawson',
      meetingTime: 'Jun 01, 09:00 AM',
    },
    {
      id: 'notification-update',
      kind: MeetingNotificationKind.UPDATE,
      meetingTitle: 'Meeting Title',
      meetingTime: 'Jun 01, 09:00 AM',
    },
    {
      id: 'notification-cancelled',
      kind: MeetingNotificationKind.CANCELLED,
      meetingTitle: 'Meeting Title',
      organizer: 'Kim Dawson',
      meetingTime: 'Jun 01, 09:00 AM',
    },
    {
      id: 'notification-ongoing',
      kind: MeetingNotificationKind.ONGOING,
      meetingTitle: 'Meeting Title',
      organizer: 'Kim Dawson',
      meetingTime: 'Jun 01, 09:50 AM',
    },
  ] satisfies readonly MeetingNotification[];

  it.each(notifications)('renders the %s variant', notification => {
    const props = notification;

    renderCard(<MeetingNotificationCard {...props} onDismiss={jest.fn()} />);

    expect(screen.getByRole('status')).toHaveTextContent('meetings.notifications.title');
    expect(screen.getByRole('button', {name: 'meetings.notifications.dismiss'})).toBeInTheDocument();

    if (notification.kind === MeetingNotificationKind.CANCELLED) {
      expect(screen.queryByRole('button', {name: 'meetings.notifications.view'})).not.toBeInTheDocument();
    } else {
      expect(screen.getByRole('button', {name: 'meetings.notifications.view'})).toBeInTheDocument();
    }
  });

  it('highlights an ongoing time', () => {
    renderCard(
      <MeetingNotificationCard
        id="notification-ongoing"
        kind={MeetingNotificationKind.ONGOING}
        meetingTitle="Meeting Title"
        {...notificationData[MeetingNotificationKind.ONGOING]}
        onDismiss={jest.fn()}
      />,
    );
    expect(screen.getByText('meetings.meetingStatus.startedAt')).toHaveStyle({color: 'var(--accent-color)'});
  });

  it('omits View for canceled cards and dismisses every variant', () => {
    const onDismiss = jest.fn();
    const {rerender} = renderCard(
      <MeetingNotificationCard
        id="notification-cancelled"
        kind={MeetingNotificationKind.CANCELLED}
        meetingTitle="Meeting Title"
        {...notificationData[MeetingNotificationKind.CANCELLED]}
        onDismiss={onDismiss}
      />,
    );
    expect(screen.queryByRole('button', {name: 'meetings.notifications.view'})).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.dismiss'}));

    rerender(
      <ThemeProvider>
        <MeetingNotificationCard
          id="notification-invite"
          kind={MeetingNotificationKind.INVITE}
          meetingTitle="Meeting Title"
          {...notificationData[MeetingNotificationKind.INVITE]}
          onDismiss={onDismiss}
        />
      </ThemeProvider>,
    );
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.dismiss'}));
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.view'}));

    expect(onDismiss).toHaveBeenCalledTimes(2);
    expect(Router.navigate).toHaveBeenCalledWith('/meetings');
  });
});
