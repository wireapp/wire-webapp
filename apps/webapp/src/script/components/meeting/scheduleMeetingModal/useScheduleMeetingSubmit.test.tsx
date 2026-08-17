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
import {GROUP_CONVERSATION_TYPE} from '@wireapp/api-client/lib/conversation';
import {CONVERSATION_PROTOCOL} from '@wireapp/api-client/lib/team';
import {maybe, task} from 'true-myth';
import {createStore} from 'zustand/vanilla';

import type {MeetingStoreState} from 'Components/meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from 'Components/meeting/meetingStore/meetingStoreProvider';
import {meetingSubmitErrors} from 'Components/meeting/meetingSubmitErrors';
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import {Conversation} from 'Repositories/entity/Conversation';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import type {MainViewModel} from 'src/script/view_model/MainViewModel';
import {translateForTest} from 'Util/test/translateForTest';

import {useScheduleMeetingSubmit} from './useScheduleMeetingSubmit';
import {useScheduleMeetingModal} from './useScheduleMeetingModal';
import {
  type ScheduleMeetingSubmitResult,
  scheduleMeetingSubmitResults,
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
  originalTitle: 'Weekly sync',
  originalStart: futureStartDate,
  originalEnd: futureEndDate,
  recurrence: 'doesNotRepeat' as const,
  originalRecurrence: 'doesNotRepeat' as const,
  selectedUsers: [],
  originalSelectedUsers: [],
  qualifiedConversation: maybe.just({id: 'conversation-id', domain: 'example.com'}),
};

const createMainViewModel = ({
  renameConversation = jest.fn().mockResolvedValue(undefined),
  safeGetConversationById = jest.fn().mockReturnValue(task.reject(new Error('unused'))),
}: {
  renameConversation?: jest.Mock;
  safeGetConversationById?: jest.Mock;
} = {}) =>
  ({
    content: {
      repositories: {
        conversation: {
          renameConversation,
          safeGetConversationById,
        },
      },
    },
  }) as unknown as MainViewModel;

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
    deleteMeetingForMe: jest.fn().mockReturnValue(task.resolve(undefined)),
    deleteMeetingForAll: jest.fn().mockReturnValue(task.resolve(undefined)),
    removeMeetingByQualifiedId: jest.fn(),
    syncMeetingByQualifiedId: jest.fn().mockReturnValue(task.reject('meetingNotFound')),
    loadMeetingForEdit: jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.updateFailed)),
  }));

const createWrapper =
  (store: ReturnType<typeof createMeetingStore>, mainViewModel: MainViewModel = createMainViewModel()) =>
  ({children}: {children: ReactNode}) => {
    const RootProviderWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        wallClock: testWallClock,
        mainViewModel,
      }),
    );

    return (
      <RootProviderWrapper>
        <MeetingStoreProvider store={store}>{children}</MeetingStoreProvider>
      </RootProviderWrapper>
    );
  };

describe('useScheduleMeetingSubmit', () => {
  beforeEach(() => {
    useScheduleMeetingModal.getState().reset(testWallClock);
    jest.spyOn(PrimaryModal, 'show').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('does not refresh meetings after a successful submit', async () => {
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
    expect(loadMeetings).not.toHaveBeenCalled();
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

  it('fails closed when original edit times are missing', async () => {
    const updateMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const store = createMeetingStore({updateMeeting});

    openEditMeetingModal();
    useScheduleMeetingModal.setState({originalStart: maybe.nothing(), originalEnd: maybe.nothing()});

    const {result} = renderHook(() => useScheduleMeetingSubmit(), {wrapper: createWrapper(store)});

    let submitResult: ScheduleMeetingSubmitResult = scheduleMeetingSubmitResults.succeeded;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(scheduleMeetingSubmitResults.submitFailed);
    expect(updateMeeting).not.toHaveBeenCalled();
  });

  const openEditMeetingModal = ({
    seriesStartDate = '2026-06-16T10:00:00.000Z',
    seriesEndDate = '2026-06-16T11:00:00.000Z',
  }: {
    seriesStartDate?: string;
    seriesEndDate?: string;
  } = {}) => {
    useScheduleMeetingModal.getState().openEdit(
      {
        title: formState.title,
        qualified_id: {id: 'meeting-id', domain: 'example.com'},
        qualified_creator: {id: 'creator-id', domain: 'example.com'},
        qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
        series_start_date: seriesStartDate,
        series_end_date: seriesEndDate,
        duration_ms: 3_600_000,
        recurrence: 'doesNotRepeat',
        conversation_id: 'conversation-id',
      },
      formState,
      {id: 'conversation-id', domain: 'example.com'},
      [],
    );
  };

  it('snapshots original edit times from the upcoming form instance', async () => {
    const updateMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}));
    const store = createMeetingStore({updateMeeting});

    openEditMeetingModal({
      seriesStartDate: '2026-06-16T09:00:00.000Z',
      seriesEndDate: '2026-06-16T10:00:00.000Z',
    });

    const {result} = renderHook(() => useScheduleMeetingSubmit(), {wrapper: createWrapper(store)});

    await act(async () => {
      await result.current.submit(formState);
    });

    expect(updateMeeting).toHaveBeenCalledWith(updateCommand);
  });

  it('shows rename retry modal and refreshes meetings when conversation rename fails after update', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const updateMeeting = jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.conversationRenameFailed));
    const store = createMeetingStore({loadMeetings, updateMeeting});

    openEditMeetingModal();

    const {result} = renderHook(() => useScheduleMeetingSubmit(), {wrapper: createWrapper(store)});

    let submitResult: ScheduleMeetingSubmitResult = scheduleMeetingSubmitResults.submitFailed;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(scheduleMeetingSubmitResults.setupFailed);
    expect(wasScheduleMeetingPersisted(submitResult)).toBe(true);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
    expect(updateMeeting).toHaveBeenCalledWith(updateCommand);
    expect(PrimaryModal.show).toHaveBeenCalledWith(
      PrimaryModal.type.CONFIRM,
      expect.objectContaining({
        text: {
          title: translateForTest('meetings.scheduleModal.error.conversationRenameFailedTitle'),
          message: translateForTest('meetings.scheduleModal.error.conversationRenameFailed'),
        },
      }),
      undefined,
      translateForTest,
    );
  });

  it('retries rename only from the confirm primary action without calling updateMeeting again', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const updateMeeting = jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.conversationRenameFailed));
    const store = createMeetingStore({loadMeetings, updateMeeting});

    const conversation = new Conversation(
      'conversation-id',
      'example.com',
      CONVERSATION_PROTOCOL.MLS,
      translateForTest,
    );
    conversation.name('Stale call name');
    conversation.groupConversationType(GROUP_CONVERSATION_TYPE.MEETING);

    const renameConversation = jest.fn().mockResolvedValue(undefined);
    const safeGetConversationById = jest.fn().mockReturnValue(task.resolve(conversation));
    const mainViewModel = createMainViewModel({renameConversation, safeGetConversationById});

    openEditMeetingModal();

    const {result} = renderHook(() => useScheduleMeetingSubmit(), {
      wrapper: createWrapper(store, mainViewModel),
    });

    await act(async () => {
      await result.current.submit(formState);
    });

    expect(updateMeeting).toHaveBeenCalledTimes(1);

    const modalOptions = (PrimaryModal.show as jest.Mock).mock.calls[0][1];
    await act(async () => {
      await modalOptions.primaryAction.action();
    });

    expect(updateMeeting).toHaveBeenCalledTimes(1);
    expect(safeGetConversationById).toHaveBeenCalledWith({id: 'conversation-id', domain: 'example.com'});
    expect(renameConversation).toHaveBeenCalledWith(conversation, 'Weekly sync');
  });
});
