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

import {act, render, screen} from '@testing-library/react';
import {task} from 'true-myth';
import {createStore} from 'zustand/vanilla';

import type {MeetingStoreState} from 'Components/meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from 'Components/meeting/meetingStore/meetingStoreProvider';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {MeetingsConversationTab} from './meetingsConversationTab';
import {SidebarTabs} from '../useSidebarStore';

describe('MeetingsConversationTab', () => {
  const createMeetingStoreForTest = (loadMeetings: jest.Mock) =>
    createStore<MeetingStoreState>(() => ({
      meetingSeries: [],
      isLoading: false,
      hasLoadError: false,
      loadMeetings,
      scheduleMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
      meetNowMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
      updateMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
      deleteMeetingForMe: jest.fn().mockReturnValue(task.resolve(undefined)),
      deleteMeetingForAll: jest.fn().mockReturnValue(task.resolve(undefined)),
      removeMeetingByQualifiedId: jest.fn(),
      syncMeetingByQualifiedId: jest.fn(),
      loadMeetingForEdit: jest.fn(),
    }));

  it('refreshes meetings when switching to the tab from another tab', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const meetingStore = createMeetingStoreForTest(loadMeetings);
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
    const rootProviderWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        fireAndForgetInvoker,
        translate: translateForTest,
      }),
    );
    const onChangeTab = jest.fn();

    render(
      withThemeAndRootContext(
        <MeetingStoreProvider store={meetingStore}>
          <MeetingsConversationTab conversationTabIndex={0} isActive={false} onChangeTab={onChangeTab} />
        </MeetingStoreProvider>,
        rootProviderWrapper,
      ),
    );

    act(() => {
      screen.getByRole('tab', {name: 'meetings.navigation.label'}).click();
    });
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(onChangeTab).toHaveBeenCalledWith(SidebarTabs.MEETINGS);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
  });

  it('does not refresh meetings when the tab is already active', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const meetingStore = createMeetingStoreForTest(loadMeetings);
    const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
    const rootProviderWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        fireAndForgetInvoker,
        translate: translateForTest,
      }),
    );
    const onChangeTab = jest.fn();

    render(
      withThemeAndRootContext(
        <MeetingStoreProvider store={meetingStore}>
          <MeetingsConversationTab conversationTabIndex={0} isActive onChangeTab={onChangeTab} />
        </MeetingStoreProvider>,
        rootProviderWrapper,
      ),
    );

    act(() => {
      screen.getByRole('tab', {name: 'meetings.navigation.label'}).click();
    });
    await act(() => fireAndForgetInvoker.waitUntilAllSettled());

    expect(onChangeTab).toHaveBeenCalledWith(SidebarTabs.MEETINGS);
    expect(loadMeetings).not.toHaveBeenCalled();
  });
});
