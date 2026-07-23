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
import {PrimaryModal} from 'Components/Modals/PrimaryModal';
import type {ConversationState} from 'Repositories/conversation/ConversationState';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import {useWarningsState} from 'src/script/view_model/WarningsContainer/WarningsState';
import {TYPE} from 'src/script/view_model/WarningsContainer/WarningsTypes';
import {translateForTest} from 'Util/test/translateForTest';

import {meetNowSubmitResults, type MeetNowSubmitResult, wasMeetNowMeetingCreated} from './meetNowTypes';
import {useMeetNowSubmit} from './useMeetNowSubmit';

const qualifiedConversation = {id: 'conversation-id', domain: 'example.com'};

const formState = {
  title: 'Standup',
  selectedUsers: [],
  participantsFilter: '',
};

const meetNowCommand = {
  title: 'Standup',
  selectedUsers: [],
};

type JoinTestMocks = {
  conversationState: ConversationState;
  findConversation: jest.Mock;
  safeGetConversationById: jest.Mock;
  startAudio: jest.Mock;
  mainViewModel: MainViewModel;
};

const createJoinTestMocks = ({
  findConversationResult = undefined,
  safeGetConversationByIdResult = task.resolve({qualifiedId: qualifiedConversation}),
  startAudioResult = Promise.resolve(undefined),
}: {
  findConversationResult?: unknown;
  safeGetConversationByIdResult?: ReturnType<typeof task.resolve> | ReturnType<typeof task.reject>;
  startAudioResult?: Promise<void>;
} = {}): JoinTestMocks => {
  const findConversation = jest.fn().mockReturnValue(findConversationResult);
  const safeGetConversationById = jest.fn().mockReturnValue(safeGetConversationByIdResult);
  const startAudio = jest.fn().mockReturnValue(startAudioResult);

  const conversationState = {
    findConversation,
  } as unknown as ConversationState;

  const mainViewModel = {
    content: {
      repositories: {
        conversation: {
          safeGetConversationById,
        },
        calling: {
          findCall: jest.fn().mockReturnValue(undefined),
        },
      },
    },
    calling: {
      callActions: {
        startAudio,
      },
    },
  } as unknown as MainViewModel;

  return {conversationState, findConversation, safeGetConversationById, startAudio, mainViewModel};
};

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
  (store: ReturnType<typeof createMeetingStore>, mainViewModel: MainViewModel) =>
  ({children}: {children: ReactNode}) => {
    const RootProviderWrapper = createRootProviderWrapperForTest(
      createRootContextValueForTest({
        translate: translateForTest,
        mainViewModel,
      }),
    );

    return (
      <RootProviderWrapper>
        <MeetingStoreProvider store={store}>{children}</MeetingStoreProvider>
      </RootProviderWrapper>
    );
  };

describe('useMeetNowSubmit', () => {
  beforeEach(() => {
    useWarningsState.setState({name: '', warnings: []});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    act(() => {
      useWarningsState.setState({name: '', warnings: []});
    });
  });

  it('returns joined, refreshes meetings, and joins the created conversation after a successful submit', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const meetNowMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: [], qualifiedConversation}));
    const store = createMeetingStore({loadMeetings, meetNowMeeting});
    const {conversationState, findConversation, safeGetConversationById, startAudio, mainViewModel} =
      createJoinTestMocks();

    const {result} = renderHook(() => useMeetNowSubmit(conversationState), {
      wrapper: createWrapper(store, mainViewModel),
    });

    let submitResult: MeetNowSubmitResult = meetNowSubmitResults.creationFailed;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(meetNowSubmitResults.joined);
    expect(meetNowMeeting).toHaveBeenCalledWith(meetNowCommand);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
    expect(findConversation).toHaveBeenCalledWith(qualifiedConversation);
    expect(safeGetConversationById).toHaveBeenCalledWith(qualifiedConversation);
    expect(startAudio).toHaveBeenCalledTimes(1);
  });

  it('returns creationFailed when meeting creation fails', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const meetNowMeeting = jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.createFailed));
    const store = createMeetingStore({loadMeetings, meetNowMeeting});
    const {conversationState, startAudio, mainViewModel} = createJoinTestMocks();

    const {result} = renderHook(() => useMeetNowSubmit(conversationState), {
      wrapper: createWrapper(store, mainViewModel),
    });

    let submitResult: MeetNowSubmitResult = meetNowSubmitResults.joined;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(meetNowSubmitResults.creationFailed);
    expect(wasMeetNowMeetingCreated(submitResult)).toBe(false);
    expect(loadMeetings).not.toHaveBeenCalled();
    expect(startAudio).not.toHaveBeenCalled();
  });

  it('returns setupFailed and refreshes meetings after a partial create failure', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const meetNowMeeting = jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.addParticipantsFailed));
    const store = createMeetingStore({loadMeetings, meetNowMeeting});
    const {conversationState, startAudio, mainViewModel} = createJoinTestMocks();

    const {result} = renderHook(() => useMeetNowSubmit(conversationState), {
      wrapper: createWrapper(store, mainViewModel),
    });

    let submitResult: MeetNowSubmitResult = meetNowSubmitResults.creationFailed;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(meetNowSubmitResults.setupFailed);
    expect(wasMeetNowMeetingCreated(submitResult)).toBe(true);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
    expect(startAudio).not.toHaveBeenCalled();
  });

  it('returns setupFailed when saving the created conversation fails', async () => {
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const meetNowMeeting = jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.conversationSetupFailed));
    const store = createMeetingStore({loadMeetings, meetNowMeeting});
    const {conversationState, startAudio, mainViewModel} = createJoinTestMocks();

    const {result} = renderHook(() => useMeetNowSubmit(conversationState), {
      wrapper: createWrapper(store, mainViewModel),
    });

    let submitResult: MeetNowSubmitResult = meetNowSubmitResults.creationFailed;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(meetNowSubmitResults.setupFailed);
    expect(wasMeetNowMeetingCreated(submitResult)).toBe(true);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
    expect(startAudio).not.toHaveBeenCalled();
  });

  it('returns joinBlocked when there is no internet connection', async () => {
    const showModalSpy = jest.spyOn(PrimaryModal, 'show');
    useWarningsState.setState({name: '', warnings: [TYPE.NO_INTERNET]});

    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const meetNowMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: [], qualifiedConversation}));
    const store = createMeetingStore({loadMeetings, meetNowMeeting});
    const {conversationState, startAudio, mainViewModel} = createJoinTestMocks();

    const {result} = renderHook(() => useMeetNowSubmit(conversationState), {
      wrapper: createWrapper(store, mainViewModel),
    });

    let submitResult: MeetNowSubmitResult = meetNowSubmitResults.creationFailed;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(meetNowSubmitResults.joinBlocked);
    expect(loadMeetings).toHaveBeenCalledTimes(1);
    expect(startAudio).not.toHaveBeenCalled();
    expect(showModalSpy).toHaveBeenCalledWith(
      PrimaryModal.type.ACKNOWLEDGE,
      expect.objectContaining({
        text: expect.objectContaining({
          title: 'callNotEstablishedTitle',
        }),
      }),
      undefined,
      translateForTest,
    );
  });

  it('returns joinFailed when joining the created conversation fails', async () => {
    const showModalSpy = jest.spyOn(PrimaryModal, 'show');
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const meetNowMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: [], qualifiedConversation}));
    const store = createMeetingStore({loadMeetings, meetNowMeeting});
    const {conversationState, startAudio, mainViewModel} = createJoinTestMocks({
      startAudioResult: Promise.reject(new Error('join failed')),
    });

    const {result} = renderHook(() => useMeetNowSubmit(conversationState), {
      wrapper: createWrapper(store, mainViewModel),
    });

    let submitResult: MeetNowSubmitResult = meetNowSubmitResults.creationFailed;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(meetNowSubmitResults.joinFailed);
    expect(startAudio).toHaveBeenCalledTimes(1);
    expect(showModalSpy).toHaveBeenCalledWith(
      PrimaryModal.type.ACKNOWLEDGE,
      expect.objectContaining({
        text: expect.objectContaining({
          title: 'callNotEstablishedTitle',
        }),
      }),
      undefined,
      translateForTest,
    );
  });

  it('returns joinFailed when the created conversation cannot be found', async () => {
    const showModalSpy = jest.spyOn(PrimaryModal, 'show');
    const loadMeetings = jest.fn().mockResolvedValue(undefined);
    const meetNowMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: [], qualifiedConversation}));
    const store = createMeetingStore({loadMeetings, meetNowMeeting});
    const {conversationState, safeGetConversationById, startAudio, mainViewModel} = createJoinTestMocks({
      safeGetConversationByIdResult: task.reject('not found'),
    });

    const {result} = renderHook(() => useMeetNowSubmit(conversationState), {
      wrapper: createWrapper(store, mainViewModel),
    });

    let submitResult: MeetNowSubmitResult = meetNowSubmitResults.creationFailed;
    await act(async () => {
      submitResult = await result.current.submit(formState);
    });

    expect(submitResult).toBe(meetNowSubmitResults.joinFailed);
    expect(safeGetConversationById).toHaveBeenCalledWith(qualifiedConversation);
    expect(startAudio).not.toHaveBeenCalled();
    expect(showModalSpy).toHaveBeenCalledWith(
      PrimaryModal.type.ACKNOWLEDGE,
      expect.objectContaining({
        text: expect.objectContaining({
          title: 'conversationNotFoundTitle',
        }),
      }),
      undefined,
      translateForTest,
    );
  });
});
