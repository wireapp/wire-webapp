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
import {withThemeAndRootContext} from 'src/script/auth/util/test/TestUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';

import {MeetingMultiActionButton, MeetingMultiActionButtonProps} from './MeetingMultiActionButton';

const createTestProps = () => {
  const handleMeetNow = jest.fn();
  const handleScheduleMeeting = jest.fn();
  const triggerContextMenu = jest.fn();

  const props: MeetingMultiActionButtonProps = {
    useMeetingActionsHook: () => ({
      handleMeetNow,
      handleScheduleMeeting,
    }),
    triggerContextMenu,
  };

  return {props, handleMeetNow, handleScheduleMeeting, triggerContextMenu};
};

const rootContextValue = createRootContextValueForTest({translate: translateForTest});
const rootProviderWrapper = createRootProviderWrapperForTest(rootContextValue);

describe('MeetingMultiActionButton', () => {
  it('opens the meeting actions menu when clicking Create meeting', () => {
    const {props, handleMeetNow, handleScheduleMeeting, triggerContextMenu} = createTestProps();

    render(withThemeAndRootContext(<MeetingMultiActionButton {...props} />, rootProviderWrapper));

    fireEvent.click(screen.getByRole('button', {name: translateForTest('meetings.action.createMeeting')}));

    expect(triggerContextMenu).toHaveBeenCalledTimes(1);
    expect(handleMeetNow).not.toHaveBeenCalled();
    expect(handleScheduleMeeting).not.toHaveBeenCalled();
  });

  it('shows Meet Now and Schedule Meeting in the dropdown menu', () => {
    const {props, triggerContextMenu} = createTestProps();

    render(withThemeAndRootContext(<MeetingMultiActionButton {...props} />, rootProviderWrapper));

    fireEvent.click(screen.getByRole('button', {name: translateForTest('meetings.action.createMeeting')}));

    expect(triggerContextMenu).toHaveBeenCalledWith(
      expect.objectContaining({
        identifier: 'meeting-actions-menu',
        placement: 'bottom-start',
        entries: [
          expect.objectContaining({
            title: translateForTest('meetings.action.meetNow'),
            label: translateForTest('meetings.action.meetNow'),
          }),
          expect.objectContaining({
            title: translateForTest('meetings.action.scheduleMeeting'),
            label: translateForTest('meetings.action.scheduleMeeting'),
          }),
        ],
      }),
    );

    const {entries} = triggerContextMenu.mock.calls[0][0];
    expect(entries).toHaveLength(2);
  });

  it('calls the correct action when a menu entry is clicked', () => {
    const {props, handleMeetNow, handleScheduleMeeting, triggerContextMenu} = createTestProps();

    render(withThemeAndRootContext(<MeetingMultiActionButton {...props} />, rootProviderWrapper));

    fireEvent.click(screen.getByRole('button', {name: translateForTest('meetings.action.createMeeting')}));

    const {entries} = triggerContextMenu.mock.calls[0][0];

    entries[0].click();
    expect(handleMeetNow).toHaveBeenCalledTimes(1);
    expect(handleScheduleMeeting).not.toHaveBeenCalled();

    entries[1].click();
    expect(handleScheduleMeeting).toHaveBeenCalledTimes(1);
  });
});
