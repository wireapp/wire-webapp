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

import {act, render, screen, waitFor} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ko from 'knockout';
import {container} from 'tsyringe';
import {task} from 'true-myth';
import {createStore} from 'zustand/vanilla';

import type {FireAndForgetInvoker} from '@wireapp/core';

import type {MeetingStoreState} from 'Components/Meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from 'Components/Meeting/meetingStore/MeetingStoreProvider';
import {meetingSubmitErrors} from 'Components/Meeting/MeetingSubmitErrors';
import {ConversationState} from 'Repositories/conversation/ConversationState';
import {User} from 'Repositories/entity/User';
import {TeamState} from 'Repositories/team/TeamState';
import {UserState} from 'Repositories/user/userState';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {MainViewModel} from 'src/script/view_model/MainViewModel';
import {useWarningsState} from 'src/script/view_model/WarningsContainer/WarningsState';
import {translateForTest} from 'Util/test/translateForTest';

import {MeetNowModal} from './meetNowModal';
import {useMeetNowModal} from './useMeetNowModal';

const qualifiedConversation = {id: 'conversation-id', domain: 'example.com'};

type DeferredFireAndForgetInvoker = FireAndForgetInvoker & {
  runPending: () => Promise<void>;
};

const createDeferredFireAndForgetInvokerForTest = (): DeferredFireAndForgetInvoker => {
  const pendingActions: Array<() => Promise<unknown>> = [];

  return {
    fireAndForget(asyncAction: () => Promise<unknown>): void {
      pendingActions.push(asyncAction);
    },
    async runPending(): Promise<void> {
      const actions = pendingActions.splice(0);
      await Promise.allSettled(actions.map(action => action()));
    },
    async waitUntilAllSettled(): Promise<void> {
      await this.runPending();
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

const createMeetingStore = () =>
  createStore<MeetingStoreState>(() => ({
    meetingSeries: [],
    isLoading: false,
    hasLoadError: false,
    loadMeetings: jest.fn().mockResolvedValue(undefined),
    scheduleMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: []})),
    meetNowMeeting: jest.fn().mockReturnValue(task.resolve({failedToAdd: [], qualifiedConversation})),
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

const renderMeetNowModal = (fireAndForgetInvoker: DeferredFireAndForgetInvoker) => {
  const store = createMeetingStore();
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

  it('does not close a reopened modal when a stale submission completes', async () => {
    const fireAndForgetInvoker = createDeferredFireAndForgetInvokerForTest();
    renderMeetNowModal(fireAndForgetInvoker);

    await openModalWithTitle('Standup');
    await submitForm();

    expect(useMeetNowModal.getState().isOpen).toBe(true);

    await userEvent.click(screen.getByRole('button', {name: 'meetings.meetNowModal.closeAriaLabel'}));
    expect(useMeetNowModal.getState().isOpen).toBe(false);

    act(() => {
      useMeetNowModal.getState().open();
    });
    expect(useMeetNowModal.getState().isOpen).toBe(true);

    await act(async () => {
      await fireAndForgetInvoker.runPending();
    });

    await waitFor(() => {
      expect(useMeetNowModal.getState().isOpen).toBe(true);
    });
  });

  it('closes the modal after a successful submit when it was not dismissed in the meantime', async () => {
    const fireAndForgetInvoker = createDeferredFireAndForgetInvokerForTest();
    renderMeetNowModal(fireAndForgetInvoker);

    await openModalWithTitle('Standup');
    await submitForm();

    await act(async () => {
      await fireAndForgetInvoker.runPending();
    });

    await waitFor(() => {
      expect(useMeetNowModal.getState().isOpen).toBe(false);
    });
  });
});
