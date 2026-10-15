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
import {task} from 'true-myth';
import {createStore} from 'zustand/vanilla';

import type {MeetingStoreState} from 'Components/meeting/meetingStore/createMeetingStore';
import {MeetingStoreProvider} from 'Components/meeting/meetingStore/meetingStoreProvider';
import type {MeetingSeries} from 'Components/meeting/types/meetingSeries';
import {PrimaryModalComponent} from 'Components/Modals/PrimaryModal/PrimaryModal';
import {removeCurrentModal} from 'Components/Modals/PrimaryModal/PrimaryModalState';
import {withThemeAndRootContext} from 'src/script/auth/util/test/testUtil';
import {
  createExecutingFireAndForgetInvokerForTest,
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {translateForTest} from 'Util/test/translateForTest';
import {KEY} from 'Util/keyboardUtil';

import {RotateMeetingLinkModal} from './rotateMeetingLinkModal';
import {useRotateMeetingLinkModal} from './useRotateMeetingLinkModal';
import {rotateMeetingLinkErrors} from '../meetingStore/rotateMeetingLinkErrors';

const meetingId = {id: 'meeting-id', domain: 'example.com'};
const rotatedLink = 'https://wire.example/new-link';

const meeting: MeetingSeries = {
  series_start_date: '2026-06-16T10:00:00.000Z',
  series_end_date: '2026-06-16T11:00:00.000Z',
  duration_ms: 3_600_000,
  recurrence: 'doesNotRepeat',
  conversation_id: 'conversation-id',
  qualified_conversation: {id: 'conversation-id', domain: 'example.com'},
  qualified_id: meetingId,
  qualified_creator: {id: 'creator-id', domain: 'example.com'},
  link: rotatedLink,
  title: 'Weekly sync',
  tzid: 'Europe/Berlin',
  has_password: false,
};

const createMeetingStore = (
  rotateMeetingLink: MeetingStoreState['rotateMeetingLink'],
  meetingSeries: MeetingSeries[] = [],
) => {
  return createStore<MeetingStoreState>(() => {
    return {
      meetingSeries,
      isLoading: false,
      hasLoadError: false,
      loadMeetings: jest.fn().mockResolvedValue(undefined),
      rotateMeetingLink,
      scheduleMeeting: jest.fn(),
      meetNowMeeting: jest.fn(),
      updateMeeting: jest.fn(),
      loadMeetingForEdit: jest.fn(),
      deleteMeetingForMe: jest.fn(),
      deleteMeetingForAll: jest.fn(),
      removeMeetingByQualifiedId: jest.fn(),
      syncMeetingByQualifiedId: jest.fn(),
    };
  });
};

const renderModal = (
  rotateMeetingLink: MeetingStoreState['rotateMeetingLink'],
  meetingSeries: MeetingSeries[] = [meeting],
) => {
  const fireAndForgetInvoker = createExecutingFireAndForgetInvokerForTest();
  const store = createMeetingStore(rotateMeetingLink, meetingSeries);

  const rootContextWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest, fireAndForgetInvoker}),
  );

  const renderResult = render(
    withThemeAndRootContext(
      <MeetingStoreProvider store={store}>
        <RotateMeetingLinkModal />
      </MeetingStoreProvider>,
      rootContextWrapper,
    ),
  );

  render(
    withThemeAndRootContext(
      <MeetingStoreProvider store={store}>
        <PrimaryModalComponent translate={translateForTest} />
      </MeetingStoreProvider>,
      rootContextWrapper,
    ),
  );

  act(() => {
    useRotateMeetingLinkModal.getState().open(meetingId);
  });

  return {fireAndForgetInvoker, unmount: renderResult.unmount};
};

describe('RotateMeetingLinkModal', () => {
  afterEach(() => {
    act(() => {
      useRotateMeetingLinkModal.getState().reset();
      removeCurrentModal();
    });
  });

  it('shows the password warning before rotating a password-protected meeting without a new password', () => {
    const rotateMeetingLink = jest.fn().mockReturnValue(task.resolve(meeting));
    renderModal(rotateMeetingLink, [{...meeting, has_password: true}]);

    fireEvent.click(screen.getByRole('button', {name: 'meetings.rotateLink.submit'}));

    expect(screen.getByText('meetings.rotateLink.generateLinkWithoutPasswordWarning')).toBeInTheDocument();
    expect(
      screen.getByRole('button', {name: 'meetings.rotateLink.generateLinkWithoutPasswordConfirm'}),
    ).toBeInTheDocument();
    expect(rotateMeetingLink).not.toHaveBeenCalled();
  });

  it('shows the password warning when the meeting is missing from the store', () => {
    const rotateMeetingLink = jest.fn().mockReturnValue(task.resolve(meeting));
    renderModal(rotateMeetingLink, []);

    fireEvent.click(screen.getByRole('button', {name: 'meetings.rotateLink.submit'}));

    expect(screen.getByText('meetings.rotateLink.generateLinkWithoutPasswordWarning')).toBeInTheDocument();
    expect(rotateMeetingLink).not.toHaveBeenCalled();
  });

  it('keeps the rotation form open when the password warning is cancelled', async () => {
    const rotateMeetingLink = jest.fn().mockReturnValue(task.resolve(meeting));
    renderModal(rotateMeetingLink, [{...meeting, has_password: true}]);

    fireEvent.click(screen.getByRole('button', {name: 'meetings.rotateLink.submit'}));
    fireEvent.click(screen.getByRole('button', {name: 'meetings.rotateLink.cancel'}));

    await waitFor(() => {
      expect(screen.queryByText('meetings.rotateLink.generateLinkWithoutPasswordWarning')).not.toBeInTheDocument();
    });
    expect(useRotateMeetingLinkModal.getState().isOpen).toBe(true);
    expect(rotateMeetingLink).not.toHaveBeenCalled();
  });

  it('rotates without a password after confirming the warning', async () => {
    const rotateMeetingLink = jest.fn().mockReturnValue(task.resolve(meeting));
    const {fireAndForgetInvoker} = renderModal(rotateMeetingLink, [{...meeting, has_password: true}]);

    fireEvent.click(screen.getByRole('button', {name: 'meetings.rotateLink.submit'}));
    fireEvent.click(screen.getByRole('button', {name: 'meetings.rotateLink.generateLinkWithoutPasswordConfirm'}));
    await act(async () => {
      await fireAndForgetInvoker.waitUntilAllSettled();
    });

    expect(rotateMeetingLink).toHaveBeenCalledWith(meetingId, undefined);
  });

  it('closes and shows the new link before the rotation modal unmounts', async () => {
    const rotateMeetingLink = jest.fn().mockReturnValue(task.resolve(meeting));
    const {fireAndForgetInvoker, unmount} = renderModal(rotateMeetingLink);
    const password = screen.getByLabelText('modalGuestLinkJoinLabel');
    const passwordConfirmation = screen.getByLabelText('modalGuestLinkJoinConfirmLabel');
    fireEvent.change(password, {target: {value: 'Secret1!'}});
    fireEvent.change(passwordConfirmation, {target: {value: 'Secret1!'}});

    fireEvent.click(screen.getByRole('button', {name: 'meetings.rotateLink.submit'}));
    await act(async () => {
      await fireAndForgetInvoker.waitUntilAllSettled();
    });

    expect(useRotateMeetingLinkModal.getState().isOpen).toBe(false);
    expect(useRotateMeetingLinkModal.getState()).toMatchObject({
      password: '',
      passwordConfirmation: '',
      error: undefined,
    });
    expect(screen.getByDisplayValue(rotatedLink)).toBeInTheDocument();

    unmount();
    expect(screen.getByDisplayValue(rotatedLink)).toBeInTheDocument();
  });

  it('keeps the generation modal open after a failed rotation and allows retry', async () => {
    const rotateMeetingLink = jest
      .fn()
      .mockReturnValueOnce(task.reject(new Error('network error')))
      .mockReturnValueOnce(task.resolve(meeting));
    const {fireAndForgetInvoker} = renderModal(rotateMeetingLink);

    fireEvent.click(screen.getByRole('button', {name: 'meetings.rotateLink.submit'}));
    await act(async () => {
      await fireAndForgetInvoker.waitUntilAllSettled();
    });

    expect(useRotateMeetingLinkModal.getState().isOpen).toBe(true);
    expect(screen.getByText('meetings.rotateLink.requestError')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'meetings.rotateLink.submit'}));
    await act(async () => {
      await fireAndForgetInvoker.waitUntilAllSettled();
    });

    expect(rotateMeetingLink).toHaveBeenCalledTimes(2);
  });

  it('shows the not-found error for a 404 rotation failure', async () => {
    const rotateMeetingLink = jest.fn().mockReturnValue(task.reject(rotateMeetingLinkErrors.notFound));
    const {fireAndForgetInvoker} = renderModal(rotateMeetingLink);

    fireEvent.click(screen.getByRole('button', {name: 'meetings.rotateLink.submit'}));
    await act(async () => {
      await fireAndForgetInvoker.waitUntilAllSettled();
    });

    expect(useRotateMeetingLinkModal.getState().isOpen).toBe(true);
    expect(screen.getByText('meetings.rotateLink.notFoundError')).toBeInTheDocument();
    expect(screen.queryByText('meetings.rotateLink.requestError')).not.toBeInTheDocument();
  });

  it('blocks close and Escape while rotation is submitting', async () => {
    const deferred = Promise.withResolvers<MeetingSeries>();
    const rotateMeetingLink = jest.fn().mockReturnValue(
      task.tryOrElse(
        () => {
          return new Error('rotation failed');
        },
        () => {
          return deferred.promise;
        },
      ),
    );
    const {fireAndForgetInvoker} = renderModal(rotateMeetingLink);

    fireEvent.click(screen.getByRole('button', {name: 'meetings.rotateLink.submit'}));
    await waitFor(() => {
      expect(screen.getByRole('button', {name: 'meetings.rotateLink.close'})).toBeDisabled();
    });

    fireEvent.click(screen.getByRole('button', {name: 'meetings.rotateLink.close'}));
    fireEvent.keyDown(screen.getByLabelText('modalGuestLinkJoinLabel'), {key: KEY.ESC});
    expect(useRotateMeetingLinkModal.getState().isOpen).toBe(true);

    deferred.resolve(meeting);
    await act(async () => {
      await fireAndForgetInvoker.waitUntilAllSettled();
    });
  });

  it('starts only one rotation for immediate duplicate submissions', async () => {
    const rotateMeetingLink = jest.fn().mockReturnValue(task.resolve(meeting));
    const {fireAndForgetInvoker} = renderModal(rotateMeetingLink);
    const submitButton = screen.getByRole('button', {name: 'meetings.rotateLink.submit'});

    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    await act(async () => {
      await fireAndForgetInvoker.waitUntilAllSettled();
    });

    expect(rotateMeetingLink).toHaveBeenCalledTimes(1);
  });
});
