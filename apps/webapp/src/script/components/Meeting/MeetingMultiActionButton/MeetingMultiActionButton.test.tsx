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

import {translateForTest} from 'Util/test/translateForTest';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import * as Context from 'src/script/ui/contextMenu';

import {MeetingMultiActionButton} from './MeetingMultiActionButton';

const handleMeetNow = jest.fn();
const handleScheduleMeeting = jest.fn();

jest.mock('Components/Meeting/useMeetingActions', () => ({
  useMeetingActions: () => ({
    handleMeetNow,
    handleScheduleMeeting,
  }),
}));

const rootContextValue = createRootContextValueForTest({translate: translateForTest});
const rootProviderWrapper = createRootProviderWrapperForTest(rootContextValue);

describe('MeetingMultiActionButton', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Context, 'showContextMenu').mockImplementation(() => undefined);
  });

  it('opens the schedule meeting modal when clicking Create meeting', () => {
    render(<MeetingMultiActionButton />, {wrapper: rootProviderWrapper});

    fireEvent.click(screen.getByRole('button', {name: translateForTest('meetings.action.createMeeting')}));

    expect(handleScheduleMeeting).toHaveBeenCalledTimes(1);
    expect(handleMeetNow).not.toHaveBeenCalled();
  });

  it('shows only Meet Now in the dropdown menu', () => {
    render(<MeetingMultiActionButton />, {wrapper: rootProviderWrapper});

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]);

    expect(Context.showContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        entries: [
          expect.objectContaining({
            title: translateForTest('meetings.action.meetNow'),
            label: translateForTest('meetings.action.meetNow'),
          }),
        ],
      }),
    );

    const {entries} = (Context.showContextMenu as jest.Mock).mock.calls[0][0];
    expect(entries).toHaveLength(1);
    expect(entries[0].title).not.toBe(translateForTest('meetings.action.scheduleMeeting'));
  });
});
