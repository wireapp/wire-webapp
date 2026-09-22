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
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {MeetingMultiActionButton, MeetingMultiActionButtonProps} from './meetingMultiActionButton';

const createTestProps = () => {
  const handleMeetNow = jest.fn();
  const handleScheduleMeeting = jest.fn();

  const props: MeetingMultiActionButtonProps = {
    useMeetingActionsHook: () => ({
      handleMeetNow,
      handleScheduleMeeting,
    }),
  };

  return {props, handleMeetNow, handleScheduleMeeting};
};

const rootContextValue = createRootContextValueForTest({translate: translateForTest});
const rootProviderWrapper = createRootProviderWrapperForTest(rootContextValue);

describe('MeetingMultiActionButton', () => {
  it('renders grouped Meet Now and Schedule Meeting buttons', () => {
    const {props} = createTestProps();

    render(withThemeAndRootContext(<MeetingMultiActionButton {...props} />, rootProviderWrapper));

    const meetNowButton = screen.getByRole('button', {name: translateForTest('meetings.action.meetNow')});
    const scheduleMeetingButton = screen.getByRole('button', {
      name: translateForTest('meetings.action.scheduleMeeting'),
    });

    expect(meetNowButton).toHaveAttribute('data-uie-name', 'meet-now');
    expect(meetNowButton).toHaveClass('buttons-group-button', 'buttons-group-button-left');
    expect(scheduleMeetingButton).toHaveAttribute('data-uie-name', 'schedule-meeting');
    expect(scheduleMeetingButton).toHaveClass('buttons-group-button', 'buttons-group-button-right');
    expect(meetNowButton.parentElement).toHaveClass('buttons-group');
  });

  it('calls Meet Now when its button is clicked', () => {
    const {props, handleMeetNow, handleScheduleMeeting} = createTestProps();

    render(withThemeAndRootContext(<MeetingMultiActionButton {...props} />, rootProviderWrapper));

    fireEvent.click(screen.getByRole('button', {name: translateForTest('meetings.action.meetNow')}));

    expect(handleMeetNow).toHaveBeenCalledTimes(1);
    expect(handleScheduleMeeting).not.toHaveBeenCalled();
  });

  it('calls Schedule Meeting when its button is clicked', () => {
    const {props, handleMeetNow, handleScheduleMeeting} = createTestProps();

    render(withThemeAndRootContext(<MeetingMultiActionButton {...props} />, rootProviderWrapper));

    fireEvent.click(screen.getByRole('button', {name: translateForTest('meetings.action.scheduleMeeting')}));

    expect(handleMeetNow).not.toHaveBeenCalled();
    expect(handleScheduleMeeting).toHaveBeenCalledTimes(1);
  });
});
