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

import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ko from 'knockout';
import {container} from 'tsyringe';
import {task} from 'true-myth';
import {createStore} from 'zustand/vanilla';

import type {CreateMeetingSuccess} from 'Components/Meeting/shared/service/meetingService';
import type {MeetingStoreState} from 'Components/Meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {meetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/userState';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import {useWarningsState} from 'src/script/view_model/WarningsContainer/WarningsState';
import {KEY} from 'Util/keyboardUtil';
import {translateForTest} from 'Util/test/translateForTest';

import {MeetNowModal} from './meetNowModal';
import {useMeetNowModal} from './useMeetNowModal';

const qualifiedConversation = {id: 'conversation-id', domain: 'example.com'};

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });

  return {promise, resolve};
};

const createDeferredMeetNowMeeting = () => {
  const deferred = createDeferred<CreateMeetingSuccess>();

  return {
    meetNowMeeting: jest.fn().mockReturnValue(
      task.tryOrElse(
        () => meetingSubmitErrors.createFailed,
        () => deferred.promise,
      ),
    ),
    resolveMeetNowMeeting: (value: CreateMeetingSuccess = {failedToAdd: [], qualifiedConversation}) => {
      deferred.resolve(value);
    },
  };
};

const createMainViewModel = (): MainViewModel => {
  const safeGetConversationById = jest.fn().mockReturnValue(task.resolve({qualifiedId: qualifiedConversation}));
  const startAudio = jest.fn().mockReturnValue(Promise.resolve(undefined));

  return {
    content: {
      repositories: {
        conversation: {
          safeGetConversationById,
          hasConversationWith: jest.fn().mockReturnValue(false),
        },
        calling: {
          findCall: jest.fn().mockReturnValue(undefined),
        },
        search: {
          normalizeQuery: (query: string) => ({query: query.trim().toLowerCase(), isHandleQuery: false}),
          searchByName: async () => [],
          searchUserInSet: () => [],
        },
        team: {
          filterExternals: async (candidateUsers: User[]) => candidateUsers,
          filterRemoteDomainUsers: async (candidateUsers: User[]) => candidateUsers,
          isSelfConnectedTo: () => false,
        },
      },
    },
    calling: {
      callActions: {
        startAudio,
      },
    },
  } as unknown as MainViewModel;
};

const createMeetingStore = (meetNowMeeting: MeetingStoreState['meetNowMeeting']) =>
  createStore<MeetingStoreState>(() => ({
    meetingSeries: [],
    isLoading: false,
    hasLoadError: false,
    loadMeetings: jest.fn().mockResolvedValue(undefined),
    scheduleMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
    meetNowMeeting,
    updateMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
    loadMeetingForEdit: jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.updateFailed)),
  }));

const setupContainerMocks = () => {
  const selfUser = new User('self-id', 'example.com', translateForTest);
  const conversationState = {
    findConversation: jest.fn().mockReturnValue(undefined),
  } as unknown as ConversationState;
  const userState = {
    self: ko.observable(selfUser),
    connectedUsers: ko.pureComputed(() => [] as User[]),
  } as unknown as UserState;
  const teamState = {
    isTeam: ko.pureComputed(() => false),
    teamUsers: ko.pureComputed(() => [] as User[]),
  } as unknown as TeamState;

  jest.spyOn(container, 'resolve').mockImplementation(token => {
    if (token === ConversationState) {
      return conversationState;
    }

    if (token === UserState) {
      return userState;
    }

    if (token === TeamState) {
      return teamState;
    }

    throw new Error(`Unexpected container token: ${String(token)}`);
  });

  return {conversationState};
};

type RenderMeetNowModalOptions = {
  meetNowMeeting?: MeetingStoreState['meetNowMeeting'];
};

const renderMeetNowModal = ({meetNowMeeting}: RenderMeetNowModalOptions = {}) => {
  const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
  const deferredMeetNowMeeting = createDeferredMeetNowMeeting();
  const store = createMeetingStore(meetNowMeeting ?? deferredMeetNowMeeting.meetNowMeeting);
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({
      translate: translateForTest,
      mainViewModel: createMainViewModel(),
      fireAndForgetInvoker,
    }),
  );

  render(
    withThemeAndRootContext(
      <MeetingStoreProvider store={store}>
        <MeetNowModal />
      </MeetingStoreProvider>,
      rootProviderWrapper,
    ),
  );

  return {
    fireAndForgetInvoker,
    resolveMeetNowMeeting: deferredMeetNowMeeting.resolveMeetNowMeeting,
  };
};

const openModalWithTitle = async (title: string) => {
  act(() => {
    useMeetNowModal.getState().open();
  });

  await userEvent.type(screen.getByLabelText('meetings.scheduleModal.titleLabel'), title);
};

const submitForm = async () => {
  await userEvent.click(screen.getByRole('button', {name: 'meetings.meetNowModal.startMeeting'}));
};

const getModalOverlay = () => screen.getByRole('dialog');

const getModalContent = () => {
  const overlay = getModalOverlay();
  const content = overlay.firstElementChild;

  if (!content) {
    throw new Error('Expected modal content element');
  }

  return content;
};

describe('MeetNowModal', () => {
  beforeEach(() => {
    useWarningsState.setState({name: '', warnings: []});
    setupContainerMocks();
  });

  afterEach(() => {
    act(() => {
      useMeetNowModal.getState().close();
      useMeetNowModal.getState().reset();
    });
    jest.restoreAllMocks();
  });

  it('does not dismiss the modal while submission is pending', async () => {
    const {fireAndForgetInvoker, resolveMeetNowMeeting} = renderMeetNowModal();

    await openModalWithTitle('Standup');
    await submitForm();

    await waitFor(() => {
      expect(screen.getByRole('button', {name: 'meetings.meetNowModal.startMeeting'})).toBeDisabled();
      expect(screen.getByRole('button', {name: 'meetings.meetNowModal.closeAriaLabel'})).toBeDisabled();
    });

    await userEvent.click(getModalOverlay());
    fireEvent.keyDown(getModalContent(), {key: KEY.ESC});
    await userEvent.click(screen.getByRole('button', {name: 'meetings.meetNowModal.closeAriaLabel'}));

    expect(useMeetNowModal.getState().isOpen).toBe(true);

    resolveMeetNowMeeting();

    await act(async () => {
      await fireAndForgetInvoker.waitUntilAllSettled();
    });

    await waitFor(() => {
      expect(useMeetNowModal.getState().isOpen).toBe(false);
    });
  });

  it('does not close a reopened modal when a stale submission completes', async () => {
    const {fireAndForgetInvoker, resolveMeetNowMeeting} = renderMeetNowModal();

    await openModalWithTitle('Standup');

    act(() => {
      fireEvent.click(screen.getByRole('button', {name: 'meetings.meetNowModal.startMeeting'}));
      fireEvent.click(screen.getByRole('button', {name: 'meetings.meetNowModal.closeAriaLabel'}));
    });

    expect(useMeetNowModal.getState().isOpen).toBe(false);

    act(() => {
      useMeetNowModal.getState().open();
    });
    expect(useMeetNowModal.getState().isOpen).toBe(true);

    resolveMeetNowMeeting();

    await act(async () => {
      await fireAndForgetInvoker.waitUntilAllSettled();
    });

    expect(useMeetNowModal.getState().isOpen).toBe(true);
  });

  it('closes the modal after a successful submit when it was not dismissed in the meantime', async () => {
    const {fireAndForgetInvoker, resolveMeetNowMeeting} = renderMeetNowModal();

    await openModalWithTitle('Standup');
    await submitForm();

    resolveMeetNowMeeting();

    await act(async () => {
      await fireAndForgetInvoker.waitUntilAllSettled();
    });

    await waitFor(() => {
      expect(useMeetNowModal.getState().isOpen).toBe(false);
    });
  });
});
