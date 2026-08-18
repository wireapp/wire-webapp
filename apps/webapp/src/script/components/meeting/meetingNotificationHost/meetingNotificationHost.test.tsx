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
import type {QualifiedId} from '@wireapp/api-client/lib/user';
import {ThemeProvider} from '@wireapp/react-ui-kit';

import {MeetingNotificationHost} from './meetingNotificationHost';
import {
  MeetingNotificationKind,
  useMeetingNotificationStore,
} from '../meetingNotificationStore/meetingNotificationStore';
import type {Translate} from 'Util/localizerUtil';
import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

const qualifiedId: QualifiedId = {id: 'meeting-id', domain: 'example.com'};
const qualifiedCreator: QualifiedId = {id: 'creator-id', domain: 'example.com'};
const meetingStartTime = '2026-06-01T09:00:00.000Z';

const translateForCountTest: Translate = (_key, substitutions) => {
  if (substitutions !== undefined && substitutions.count !== undefined) {
    return `${substitutions.count}`;
  }

  return '';
};

const getHost = () => document.querySelector('[data-uie-name="meeting-notification-host"]');
const getList = () => document.getElementById('meeting-notification-list');

const renderHost = (isStandalone = true, translate: Translate = translateForTest) =>
  render(
    <ThemeProvider>
      <MeetingNotificationHost isStandalone={isStandalone} />
    </ThemeProvider>,
    {wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate}))},
  );

describe('MeetingNotificationHost', () => {
  beforeEach(() => {
    useMeetingNotificationStore.getState().clearNotifications();
  });

  it('renders nothing when there are no notifications', () => {
    renderHost();

    expect(getHost()).not.toBeInTheDocument();
  });

  it('shows the active card count in the collapsed header', () => {
    useMeetingNotificationStore.getState().addNotification({
      kind: MeetingNotificationKind.CANCELLED,
      qualifiedId,
      meetingTitle: 'Canceled',
      qualifiedCreator,
      meetingStartTime,
    });
    useMeetingNotificationStore.getState().addNotification({
      kind: MeetingNotificationKind.UPDATE,
      qualifiedId,
      meetingTitle: 'Updated',
      qualifiedCreator,
      meetingStartTime,
    });
    useMeetingNotificationStore.getState().addNotification({
      kind: MeetingNotificationKind.ONGOING,
      qualifiedId,
      meetingTitle: 'Ongoing',
      qualifiedCreator,
      meetingStartTime,
    });
    useMeetingNotificationStore.getState().addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Invited',
      qualifiedCreator,
      meetingStartTime,
    });

    renderHost(true, translateForCountTest);

    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.queryByText('meetings.notifications.title')).not.toBeInTheDocument();
  });

  it('dismisses all notifications from the collapsed view', () => {
    useMeetingNotificationStore.getState().addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'One',
      qualifiedCreator,
      meetingStartTime,
    });

    renderHost();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.dismissAll'}));

    expect(getHost()).not.toBeInTheDocument();
  });

  it('expands to individual cards and dismisses only the selected card', () => {
    const {addNotification} = useMeetingNotificationStore.getState();
    addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'One',
      qualifiedCreator,
      meetingStartTime,
    });
    addNotification({
      kind: MeetingNotificationKind.ONGOING,
      qualifiedId,
      meetingTitle: 'Ongoing',
      qualifiedCreator,
      meetingStartTime,
    });
    addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Two',
      qualifiedCreator,
      meetingStartTime,
    });
    addNotification({
      kind: MeetingNotificationKind.CANCELLED,
      qualifiedId,
      meetingTitle: 'Canceled',
      qualifiedCreator,
      meetingStartTime,
    });
    addNotification({
      kind: MeetingNotificationKind.UPDATE,
      qualifiedId,
      meetingTitle: 'Updated',
      qualifiedCreator,
      meetingStartTime,
    });

    renderHost();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.showAll'}));

    expect(screen.getAllByRole('listitem')).toHaveLength(5);
    expect(screen.getAllByRole('listitem').map(item => item.getAttribute('data-uie-name'))).toEqual([
      'meeting-notification-card-meeting-notification-4',
      'meeting-notification-card-meeting-notification-3',
      'meeting-notification-card-meeting-notification-2',
      'meeting-notification-card-meeting-notification-1',
      'meeting-notification-card-meeting-notification-0',
    ]);
    expect(getList()).toHaveStyle({overflowY: 'auto'});
    fireEvent.click(screen.getAllByRole('button', {name: 'meetings.notifications.dismiss'})[0]);
    expect(screen.getAllByRole('listitem')).toHaveLength(4);
    expect(screen.getAllByText('meetings.notifications.title')).toHaveLength(4);
  });

  it('dismisses all cards and collapse preserves cards', () => {
    useMeetingNotificationStore.getState().addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      qualifiedCreator,
      meetingStartTime,
    });

    renderHost();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.showAll'}));
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.hide'}));
    expect(screen.getByText('meetings.notifications.total')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.showAll'}));
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.dismissAll'}));

    expect(getHost()).not.toBeInTheDocument();
  });

  it('resets the expanded state when all notifications are dismissed', () => {
    useMeetingNotificationStore.getState().addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      qualifiedCreator,
      meetingStartTime,
    });

    renderHost();
    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.showAll'}));
    expect(useMeetingNotificationStore.getState().isExpanded).toBe(true);

    fireEvent.click(screen.getByRole('button', {name: 'meetings.notifications.dismissAll'}));
    expect(useMeetingNotificationStore.getState().isExpanded).toBe(false);
  });

  it('shares the expanded state across multiple rendered hosts', () => {
    useMeetingNotificationStore.getState().addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      qualifiedCreator,
      meetingStartTime,
    });

    render(
      <ThemeProvider>
        <MeetingNotificationHost isStandalone={false} />
        <MeetingNotificationHost isStandalone />
      </ThemeProvider>,
      {wrapper: createRootProviderWrapperForTest(createRootContextValueForTest({translate: translateForTest}))},
    );

    fireEvent.click(screen.getAllByRole('button', {name: 'meetings.notifications.showAll'})[0]);

    expect(screen.getAllByRole('button', {name: 'meetings.notifications.hide'})).toHaveLength(2);
  });

  it('switches between overlay and standalone styles as isStandalone toggles', () => {
    useMeetingNotificationStore.getState().addNotification({
      kind: MeetingNotificationKind.INVITE,
      qualifiedId,
      meetingTitle: 'Meeting',
      qualifiedCreator,
      meetingStartTime,
    });

    const {rerender} = renderHost(false);
    expect(getHost()).not.toHaveStyle({left: '100%'});

    rerender(
      <ThemeProvider>
        <MeetingNotificationHost isStandalone />
      </ThemeProvider>,
    );

    expect(getHost()).toHaveStyle({left: '100%'});
  });
});
