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
import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
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
import {
  scheduleMeetingSubmitResults,
  type ScheduleMeetingSubmitResult,
  wasScheduleMeetingPersisted,
} from './scheduleMeetingTypes';

const fixedNow = new Date('2026-06-16T09:00:00.000Z');
const futureStartDate = new Date('2026-06-16T10:00:00.000Z');
const futureEndDate = new Date('2026-06-16T11:00:00.000Z');

const testWallClock = createDeterministicWallClock({
  initialCurrentTimestampInMilliseconds: fixedNow.getTime(),
});

const formState = {
  title: 'Weekly sync',
  start: maybe.just(futureStartDate),
  end: maybe.just(futureEndDate),
  recurrence: 'doesNotRepeat' as const,
  selectedUsers: [],
  participantsFilter: '',
};

const scheduleCommand = {
  title: 'Weekly sync',
  start: futureStartDate,
  end: futureEndDate,
  recurrence: 'doesNotRepeat' as const,
  selectedUsers: [],
};

const updateCommand = {
  meetingId: {id: 'meeting-id', domain: 'example.com'},
  title: 'Weekly sync',
  start: futureStartDate,
  end: futureEndDate,
  recurrence: 'doesNotRepeat' as const,
  originalRecurrence: 'doesNotRepeat' as const,
  selectedUsers: [],
  originalSelectedUsers: [],
  qualifiedConversation: maybe.just({id: 'conversation-id', domain: 'example.com'}),
};

const RootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForTest, wallClock: testWallClock}),
);

const createMeetingStore = ({
  loadMeetings = jest.fn().mockResolvedValue(undefined),
  scheduleMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
  updateMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
}: Partial<Pick<MeetingStoreState, 'loadMeetings' | 'scheduleMeeting' | 'updateMeeting'>> = {}) =>
  createStore<MeetingStoreState>(() => ({
    meetingSeries: [],
    isLoading: false,
    hasLoadError: false,
    loadMeetings,
    scheduleMeeting,
    meetNowMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
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
    useScheduleMeetingModal.getState().reset(testWallClock);
  });

  it('refreshes meetings after a successful submit', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const scheduleMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const store = createMeetingStore({loadMeetings, scheduleMeeting});

    const {result} = renderHook(() => useScheduleMeetingSubmit(), {wrapper: createWrapper(store)});

    let submitResult: ScheduleMeetingSubmitResult = scheduleMeetingSubmitResults.submitFailed;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(scheduleMeetingSubmitResults.succeeded);
    expect(scheduleMeeting).toHaveBeenCalledWith(scheduleCommand);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
  });

  it('returns setupFailed and refreshes meetings after a partial create failure', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const scheduleMeeting = jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.addParticipantsFailed));
    const store = createMeetingStore({loadMeetings, scheduleMeeting});

    const {result} = renderHook(() => useScheduleMeetingSubmit(), {wrapper: createWrapper(store)});

    let submitResult: ScheduleMeetingSubmitResult = scheduleMeetingSubmitResults.submitFailed;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(scheduleMeetingSubmitResults.setupFailed);
    expect(wasScheduleMeetingPersisted(submitResult)).toBe(true);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
  });

  it('returns setupFailed and refreshes meetings after a partial update failure', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const updateMeeting = jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.removeParticipantsFailed));
    const store = createMeetingStore({loadMeetings, updateMeeting});

    useScheduleMeetingModal.getState().openEdit(
      {
        title: formState.title,
        qualified_id: {id: 'meeting-id', domain: 'example.com'},
        qualified_creator: {id: 'creator-id', domain: 'example.com'},
        qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
        series_start_date: '2026-06-16T10:00:00.000Z',
        series_end_date: '2026-06-16T11:00:00.000Z',
        duration_ms: 3_600_000,
        recurrence: 'doesNotRepeat',
        conversation_id: 'conversation-id',
      },
      formState,
      {id: 'conversation-id', domain: 'example.com'},
      [],
    );

    const {result} = renderHook(() => useScheduleMeetingSubmit(), {wrapper: createWrapper(store)});

    let submitResult: ScheduleMeetingSubmitResult = scheduleMeetingSubmitResults.submitFailed;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(scheduleMeetingSubmitResults.setupFailed);
    expect(wasScheduleMeetingPersisted(submitResult)).toBe(true);
    expect(updateMeeting).toHaveBeenCalledWith(updateCommand);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
  });

  it('returns submitFailed and does not refresh meetings when create fails before server state changes', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const scheduleMeeting = jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.createFailed));
    const store = createMeetingStore({loadMeetings, scheduleMeeting});

    const {result} = renderHook(() => useScheduleMeetingSubmit(), {wrapper: createWrapper(store)});

    let submitResult: ScheduleMeetingSubmitResult = scheduleMeetingSubmitResults.submitFailed;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(scheduleMeetingSubmitResults.submitFailed);
    expect(wasScheduleMeetingPersisted(submitResult)).toBe(false);
    expect(loadMeetings).not.toHaveBeenCalled();
  });
});
