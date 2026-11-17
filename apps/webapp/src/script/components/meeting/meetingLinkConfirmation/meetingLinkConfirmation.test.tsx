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

import en from '../../../../i18n/en-US.json';
import {ThemeProvider} from '../../../uiKit';

import {translateForTest} from '../../../util/test/translateForTest';

import {MeetingLinkConfirmationMessage} from './meetingLinkConfirmation';

describe('MeetingLinkConfirmationMessage', () => {
  it('shows the existing copy-to-clipboard action', () => {
    render(
      <ThemeProvider>
        <MeetingLinkConfirmationMessage
          link="https://wire.example/meeting-link"
          hasPassword={false}
          translate={translateForTest}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText('meetings.meetingLink.description')).toBeInTheDocument();
    expect(screen.getByRole('textbox', {name: 'meetings.meetingLink.title'})).toHaveTextContent(
      'https://wire.example/meeting-link',
    );
    expect(screen.getByRole('textbox', {name: 'meetings.meetingLink.title'})).toHaveAttribute(
      'aria-describedby',
      'meeting-link-description',
    );
    expect(screen.getByRole('textbox', {name: 'meetings.meetingLink.title'})).toHaveAttribute('aria-readonly', 'true');
    expect(screen.getByRole('textbox', {name: 'meetings.meetingLink.title'})).toHaveAttribute('tabindex', '0');
    expect(screen.getByRole('button', {name: 'meetings.meetingLink.copyLink'})).toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'meetings.meetingLink.cancel'})).toBeInTheDocument();
    expect(window.getComputedStyle(screen.getByTestId('copy-to-clipboard-icon')).fill).toBe('currentColor');
  });

  it('shows the correct guidance for both password states', () => {
    const {rerender} = render(
      <ThemeProvider>
        <MeetingLinkConfirmationMessage
          link="https://wire.example/meeting-link"
          hasPassword={false}
          translate={translateForTest}
        />
      </ThemeProvider>,
    );
    expect(screen.getByRole('note')).toHaveTextContent('meetings.meetingLink.passwordUnprotected');
    rerender(
      <ThemeProvider>
        <MeetingLinkConfirmationMessage
          link="https://wire.example/meeting-link"
          hasPassword
          translate={translateForTest}
        />
      </ThemeProvider>,
    );
    expect(screen.getByRole('note')).toHaveTextContent('meetings.meetingLink.passwordProtected');
    expect(screen.getByRole('note')).not.toHaveTextContent('meetings.meetingLink.passwordUnprotected');
  });

  it('uses the meeting link copy from the story', () => {
    expect(en['meetings.meetingLink.description']).toBe('Anyone with the link can access the meeting.');
    expect(en['meetings.meetingLink.passwordProtected']).toBe(
      'The link is password protected. To set a new password, generate a new link.',
    );
    expect(en['meetings.meetingLink.passwordUnprotected']).toBe(
      'This link is not password protected. Make sure to share it only with the right people. To add a password, generate a new link.',
    );
    expect(en['meetings.meetingLink.cancel']).toBe('Cancel');
  });
});
