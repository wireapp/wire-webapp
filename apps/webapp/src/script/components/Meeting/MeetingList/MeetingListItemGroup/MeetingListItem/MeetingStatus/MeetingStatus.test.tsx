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
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';

import {
  MeetingStatus,
  type MeetingStatusProps,
} from 'Components/Meeting/MeetingList/MeetingListItemGroup/MeetingListItem/MeetingStatus/MeetingStatus';
import {translateForTest} from 'Util/test/translateForTest';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

const THIRTY_MINUTES_MS = 30 * 60 * 1_000;

const ongoingWallClock = createDeterministicWallClock({
  initialCurrentTimestampInMilliseconds: 1_000_000_000_000,
});

const meetingStartIso = new Date(ongoingWallClock.currentTimestampInMilliseconds - THIRTY_MINUTES_MS).toISOString();
const meetingEndIso = new Date(ongoingWallClock.currentTimestampInMilliseconds + THIRTY_MINUTES_MS).toISOString();

const createTestProps = (): MeetingStatusProps & {joinMeeting: jest.Mock} => {
  const joinMeeting = jest.fn();

  return {
    start_date: meetingStartIso,
    end_date: meetingEndIso,
    nowMilliseconds: ongoingWallClock.currentTimestampInMilliseconds,
    joinMeeting,
    isJoinDisabled: false,
    isCallActive: false,
  };
};

const rootContextValue = createRootContextValueForTest({translate: translateForTest});
const rootProviderWrapper = createRootProviderWrapperForTest(rootContextValue);

describe('MeetingStatus', () => {
  it('calls joinMeeting when the Join button is clicked on an ongoing meeting', () => {
    const {joinMeeting, ...props} = createTestProps();

    render(withThemeAndRootContext(<MeetingStatus {...props} joinMeeting={joinMeeting} />, rootProviderWrapper));

    fireEvent.click(screen.getByRole('button', {name: translateForTest('callJoin')}));

    expect(joinMeeting).toHaveBeenCalledTimes(1);
  });

  it('shows Participating when the user is attending the meeting call', () => {
    const {joinMeeting: _joinMeeting, ...props} = createTestProps();

    render(
      withThemeAndRootContext(
        <MeetingStatus {...props} joinMeeting={jest.fn()} isJoinDisabled isCallActive />,
        rootProviderWrapper,
      ),
    );

    expect(screen.getByText(translateForTest('meetings.meetingStatus.participating'))).toBeInTheDocument();
    expect(screen.queryByRole('button', {name: translateForTest('callJoin')})).not.toBeInTheDocument();
  });
});
