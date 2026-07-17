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

import type {ReactNode} from 'react';

import {act, renderHook} from '@testing-library/react';
import {task} from 'true-myth';
import {createStore} from 'zustand/vanilla';

import type {MeetingStoreState} from 'Components/Meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {meetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import {translateForTest} from 'Util/test/translateForTest';

import {useMeetNowSubmit} from './useMeetNowSubmit';

const qualifiedConversation = {id: 'conversation-id', domain: 'example.com'};

const formState = {
  title: 'Standup',
  selectedUsers: [],
  participantsFilter: '',
};

const createMainViewModelForTest = (): MainViewModel =>
  ({
    content: {
      repositories: {
        conversation: {
          safeGetConversationById: jest.fn().mockReturnValue(task.resolve({qualifiedId: qualifiedConversation})),
        },
        calling: {
          findCall: jest.fn().mockReturnValue(undefined),
        },
      },
    },
    calling: {
      callActions: {
        startAudio: jest.fn().mockResolvedValue(undefined),
      },
    },
  }) as unknown as MainViewModel;

const RootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({
    translate: translateForTest,
    mainViewModel: createMainViewModelForTest(),
  }),
);

const createMeetingStore = ({
  loadMeetings = jest.fn().mockResolvedValue(undefined),
  meetNowMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: [], qualifiedConversation})),
}: Partial<Pick<MeetingStoreState, 'loadMeetings' | 'meetNowMeeting'>> = {}) =>
  createStore<MeetingStoreState>(() => ({
    meetingSeries: [],
    isLoading: false,
    hasLoadError: false,
    loadMeetings,
    scheduleMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
    meetNowMeeting,
    updateMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
    loadMeetingForEdit: jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.updateFailed)),
  }));

const createWrapper =
  (store: ReturnType<typeof createMeetingStore>) =>
  ({children}: {children: ReactNode}) => (
    <RootProviderWrapper>
      <MeetingStoreProvider store={store}>{children}</MeetingStoreProvider>
    </RootProviderWrapper>
  );

describe('useMeetNowSubmit', () => {
  it('refreshes meetings after a successful submit', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const meetNowMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: [], qualifiedConversation}));
    const store = createMeetingStore({loadMeetings, meetNowMeeting});

    const {result} = renderHook(() => useMeetNowSubmit(), {wrapper: createWrapper(store)});

    let submitResult = false;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(true);
    expect(meetNowMeeting).toHaveBeenCalledWith(formState);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
  });

  it('returns false when meeting creation fails', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const meetNowMeeting = jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.createFailed));
    const store = createMeetingStore({loadMeetings, meetNowMeeting});

    const {result} = renderHook(() => useMeetNowSubmit(), {wrapper: createWrapper(store)});

    let submitResult = true;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(false);
    expect(loadMeetings).not.toHaveBeenCalled();
  });
});
