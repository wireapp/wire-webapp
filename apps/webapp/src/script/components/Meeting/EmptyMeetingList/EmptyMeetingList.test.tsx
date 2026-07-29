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

import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {EmptyMeetingList} from './EmptyMeetingList';

const startMeetingHelpText =
  'Start a meeting with team members. Your communication is always end-to-end encrypted, offering the highest level of security.';

const translateForEmptyMeetingListTest = (translationKey: string) => {
  if (translationKey === 'meetings.startMeetingHelp') {
    return startMeetingHelpText;
  }

  if (translationKey === 'meetings.noMeetingsText') {
    return 'No meetings yet.';
  }

  if (translationKey === 'meetings.action.meetNow') {
    return 'Meet now';
  }

  if (translationKey === 'meetings.action.scheduleMeeting') {
    return 'Schedule meeting';
  }

  return translationKey;
};

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForEmptyMeetingListTest}),
);

describe('EmptyMeetingList', () => {
  it('does not mention guests or external parties in the empty-state help text', () => {
    render(
      withThemeAndRootContext(
        <EmptyMeetingList
          useMeetingActionsHook={() => ({
            handleMeetNow: jest.fn(),
            handleScheduleMeeting: jest.fn(),
          })}
        />,
        rootProviderWrapper,
      ),
    );

    expect(screen.getByText(startMeetingHelpText)).toBeInTheDocument();
    expect(screen.queryByText(/guests|external parties/i)).not.toBeInTheDocument();
  });
});
