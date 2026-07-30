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

import {MeetingNotificationCard} from './meetingNotificationCard';

describe('MeetingNotificationCard', () => {
  it('renders the demo content and triggers its actions', () => {
    const onDismiss = jest.fn();
    const onView = jest.fn();

    const {rerender} = render(
      <MeetingNotificationCard kind="invite" count={1} meetingTitles={['Meeting Title']} onDismiss={onDismiss} onView={onView} />,
    );

    expect(screen.getByRole('status')).toHaveTextContent('Invitation: Meeting Title');
    rerender(
      <MeetingNotificationCard
        kind="invite"
        count={3}
        meetingTitles={['Meeting Title 1', 'Meeting Title 2', 'Meeting Title 3']}
        onDismiss={onDismiss}
        onView={onView}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Invite: 3 New Meetings');
    fireEvent.click(screen.getByRole('button', {name: 'Dismiss'}));
    fireEvent.click(screen.getByRole('button', {name: 'View'}));

    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(onView).toHaveBeenCalledTimes(1);
  });
});
