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
import {maybe, task} from 'true-myth';
import {createStore} from 'zustand/vanilla';

import type {MeetingStoreState} from 'Components/Meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {meetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';

import {useScheduleMeetingSubmit} from './useScheduleMeetingSubmit';
import {useScheduleMeetingModal} from './useScheduleMeetingModal';

const formState = {
  title: 'Weekly sync',
  start: maybe.just(new Date('2026-06-16T10:00:00.000Z')),
  end: maybe.just(new Date('2026-06-16T11:00:00.000Z')),
  recurrence: 'doesNotRepeat' as const,
  selectedUsers: [],
  participantsFilter: '',
};

const RootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest}),
);

const createMeetingStore = ({
  loadMeetings = jest.fn().mockResolvedValue(undefined),
  scheduleMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
  updateMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
}: Partial<Pick<MeetingStoreState, 'loadMeetings' | 'scheduleMeeting' | 'updateMeeting'>> = {}) =>
  createStore<MeetingStoreState>(() => ({
    meetings: [],
    isLoading: false,
    hasLoadError: false,
    loadMeetings,
    scheduleMeeting,
    updateMeeting,
    loadMeetingForEdit: jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.updateFailed)),
  }));

const createWrapper =
  (store: ReturnType<typeof createMeetingStore>) =>
  ({children}: {children: ReactNode}) => (
    <RootProviderWrapper>
      <MeetingStoreProvider store={store}>{children}</MeetingStoreProvider>
    </RootProviderWrapper>
  );

describe('useScheduleMeetingSubmit', () => {
  beforeEach(() => {
    useScheduleMeetingModal.getState().reset();
  });

  it('refreshes meetings after a successful submit', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const scheduleMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const store = createMeetingStore({loadMeetings, scheduleMeeting});

    const {result} = renderHook(() => useScheduleMeetingSubmit(), {wrapper: createWrapper(store)});

    let submitResult = false;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(true);
    expect(scheduleMeeting).toHaveBeenCalledWith(formState);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
  });

  it('refreshes meetings after a partial create failure', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const scheduleMeeting = jest
      .fn()
      .mockReturnValue(task.reject(meetingSubmitErrors.addParticipantsFailed));
    const store = createMeetingStore({loadMeetings, scheduleMeeting});

    const {result} = renderHook(() => useScheduleMeetingSubmit(), {wrapper: createWrapper(store)});

    let submitResult = false;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(false);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
  });

  it('refreshes meetings after a partial update failure', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const updateMeeting = jest
      .fn()
      .mockReturnValue(task.reject(meetingSubmitErrors.removeParticipantsFailed));
    const store = createMeetingStore({loadMeetings, updateMeeting});

    useScheduleMeetingModal.getState().openEdit(
      {
        title: formState.title,
        qualified_id: { id: 'meeting-id', domain: 'example.com' },
        qualified_creator: { id: 'creator-id', domain: 'example.com' },
        qualified_conversation: { id: 'conversation-id', domain: 'example.com' },
        start_date: '',
        end_date: '',
        recurrence: 'doesNotRepeat',
        conversation_id: ''
      },
      formState,
      {id: 'conversation-id', domain: 'example.com'},
      [],
    );

    const {result} = renderHook(() => useScheduleMeetingSubmit(), {wrapper: createWrapper(store)});

    let submitResult = false;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(false);
    expect(updateMeeting).toHaveBeenCalled();
    expect(loadMeetings).toHaveBeenCalledTimes(1);
  });

  it('does not refresh meetings when create fails before server state changes', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const scheduleMeeting = jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.createFailed));
    const store = createMeetingStore({loadMeetings, scheduleMeeting});

    const {result} = renderHook(() => useScheduleMeetingSubmit(), {wrapper: createWrapper(store)});

    let submitResult = false;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(false);
    expect(loadMeetings).not.toHaveBeenCalled();
  });
});
