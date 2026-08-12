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

import {createDeterministicWallClock} from '@enormora/wall-clock/deterministic-wall-clock';
import {act, fireEvent, render, screen, waitFor} from '@testing-library/react';
import ko from 'knockout';
import {container} from 'tsyringe';
import {maybe, task} from 'true-myth';
import {createStore} from 'zustand/vanilla';

import type {MeetingStoreState} from 'Components/meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from 'Components/meeting/meetingStore/meetingStoreProvider';
import {meetingSubmitErrors} from 'Components/meeting/meetingSubmitErrors';
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
import {KEY} from 'Util/keyboardUtil';
import {translateForTest} from 'Util/test/translateForTest';

import {ScheduleMeetingModal} from './scheduleMeetingModal';
import {useScheduleMeetingModal} from './useScheduleMeetingModal';

const testWallClock = createDeterministicWallClock({
  initialCurrentTimestampInMilliseconds: Date.parse('2026-08-12T10:00:00Z'),
});

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(resolvePromise => {
    resolve = resolvePromise;
  });

  return {promise, resolve};
};

const createMeetingStore = (scheduleMeeting: MeetingStoreState['scheduleMeeting']) =>
  createStore<MeetingStoreState>(() => ({
    meetingSeries: [],
    isLoading: false,
    hasLoadError: false,
    loadMeetings: jest.fn().mockResolvedValue(undefined),
    scheduleMeeting,
    meetNowMeeting: jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.createFailed)),
    updateMeeting: jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.updateFailed)),
    loadMeetingForEdit: jest.fn().mockReturnValue(task.reject(meetingSubmitErrors.updateFailed)),
  }));

const setupContainerMocks = () => {
  const selfUser = new User('self-id', 'example.com', translateForTest);
  const conversationState = {findConversation: jest.fn().mockReturnValue(undefined)} as unknown as ConversationState;
  const userState = {
    self: ko.observable(selfUser),
    connectedUsers: ko.pureComputed(() => [] as User[]),
  } as unknown as UserState;
  const teamState = {
    isTeam: ko.pureComputed(() => false),
    teamUsers: ko.pureComputed(() => [] as User[]),
  } as unknown as TeamState;

  jest.spyOn(container, 'resolve').mockImplementation(token => {
    if (token === ConversationState) return conversationState;
    if (token === UserState) return userState;
    if (token === TeamState) return teamState;
    throw new Error(`Unexpected container token: ${String(token)}`);
  });
};

const renderModal = (scheduleMeeting = jest.fn().mockReturnValue(task.resolve({failedToAdd: []}))) => {
  setupContainerMocks();
  const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
  const store = createMeetingStore(scheduleMeeting);
  const mainViewModel = {
    content: {
      repositories: {
        conversation: {findConversation: jest.fn()},
        search: {searchByName: async () => [], searchUserInSet: () => []},
        team: {
          filterExternals: async (users: User[]) => users,
          filterRemoteDomainUsers: async (users: User[]) => users,
        },
      },
    },
  };

  render(
    withThemeAndRootContext(
      <MeetingStoreProvider store={store}>
        <ScheduleMeetingModal />
      </MeetingStoreProvider>,
      createRootProviderWrapperForTest(
        createRootContextValueForTest({
          translate: translateForTest,
          wallClock: testWallClock,
          mainViewModel: mainViewModel as never,
          fireAndForgetInvoker,
        }),
      ),
    ),
  );

  act(() => {
    useScheduleMeetingModal.getState().openCreate(testWallClock);
  });

  return {fireAndForgetInvoker};
};

describe('ScheduleMeetingModal', () => {
  afterEach(() => {
    act(() => {
      useScheduleMeetingModal.getState().close();
      useScheduleMeetingModal.getState().reset(testWallClock);
    });
    jest.restoreAllMocks();
  });

  it('focuses the title and closes when Escape is pressed after opening', () => {
    renderModal();

    const title = screen.getByLabelText('meetings.scheduleModal.titleLabel');
    expect(title).toHaveFocus();

    fireEvent.keyDown(title, {key: KEY.ESC});

    expect(useScheduleMeetingModal.getState().isOpen).toBe(false);
  });

  it('stays open when Escape is pressed while submission is pending', async () => {
    const deferred = createDeferred<{failedToAdd: User[]}>();
    const scheduleMeeting = jest.fn().mockReturnValue(
      task.tryOrElse(
        () => meetingSubmitErrors.createFailed,
        () => deferred.promise,
      ),
    );
    const {fireAndForgetInvoker} = renderModal(scheduleMeeting);

    act(() => {
      useScheduleMeetingModal.getState().setTitle('Standup');
      useScheduleMeetingModal.getState().setStart(maybe.just(new Date('2026-08-13T10:00:00Z')));
      useScheduleMeetingModal.getState().setEnd(maybe.just(new Date('2026-08-13T11:00:00Z')));
    });
    const submitButton = screen.getByRole('button', {name: 'meetings.action.scheduleMeeting'});
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
    fireEvent.keyDown(screen.getByLabelText('meetings.scheduleModal.titleLabel'), {key: KEY.ESC});

    expect(useScheduleMeetingModal.getState().isOpen).toBe(true);

    deferred.resolve({failedToAdd: []});
    await act(async () => {
      await fireAndForgetInvoker.waitUntilAllSettled();
    });
  });
});
