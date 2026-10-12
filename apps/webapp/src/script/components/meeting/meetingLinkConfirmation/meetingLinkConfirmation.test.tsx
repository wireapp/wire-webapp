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

import {render, screen} from '@testing-library/react';
import {ThemeProvider} from '@wireapp/react-ui-kit';

import {translateForTest} from 'Util/test/translateForTest';

import {MeetingLinkConfirmationMessage} from './meetingLinkConfirmation';

describe('MeetingLinkConfirmationMessage', () => {
  it('shows the existing copy-to-clipboard action', () => {
    render(
      <ThemeProvider>
        <MeetingLinkConfirmationMessage link="https://wire.example/meeting-link" translate={translateForTest} />
      </ThemeProvider>,
    );

    expect(screen.getByText('meetings.meetingLink.description')).toBeInTheDocument();
    expect(screen.getByDisplayValue('https://wire.example/meeting-link')).toHaveAttribute(
      'aria-describedby',
      'meeting-link-description',
    );
    expect(screen.getByDisplayValue('https://wire.example/meeting-link')).toHaveAttribute('readonly');
    expect(screen.getByRole('button', {name: 'meetings.meetingLink.copyLink'})).toBeInTheDocument();
  });
});
