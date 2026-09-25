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
import {ThemeProvider} from '@wireapp/react-ui-kit';
import {task} from 'true-myth';

import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import {KEY} from 'Util/keyboardUtil';
import {translateForTest} from 'Util/test/translateForTest';

import {MeetingPrepModal} from './meetingPrepModal';
import {meetingPrepPreviewErrors, type RequestMeetingPrepPreview} from './meetingPrepTypes';
import {useMeetingPrepModal, type MeetingPrepSession} from './useMeetingPrepModal';

const session: MeetingPrepSession = {
  meetingTitle: 'Design review',
  meetingStartTime: '2026-06-01T09:00:00.000Z',
  qualifiedMeetingId: {id: 'meeting-id', domain: 'example.com'},
  qualifiedConversationId: {id: 'conversation-id', domain: 'example.com'},
};

const pendingPreview: RequestMeetingPrepPreview = () =>
  task.tryOrElse(
    () => meetingPrepPreviewErrors.requestFailed,
    () => new Promise<MediaStream>(() => undefined),
  );

const expectClosed = async () => {
  expect(screen.queryByRole('heading', {name: 'Design review'})).not.toBeInTheDocument();
  await waitFor(() => {
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
};

const renderModal = (joinMeeting: jest.Mock = jest.fn().mockResolvedValue(true)) => {
  const rootProviderWrapper = createRootProviderWrapperForTest(
    createRootContextValueForTest({translate: translateForTest}),
  );

  render(
    <ThemeProvider>
      <MeetingPrepModal
        participantName="Ada"
        requestPreviewStream={pendingPreview}
        releasePreviewStream={jest.fn()}
        joinMeeting={joinMeeting}
      />
    </ThemeProvider>,
    {wrapper: rootProviderWrapper},
  );
};

describe('MeetingPrepModal', () => {
  afterEach(() => {
    act(() => {
      useMeetingPrepModal.getState().close();
    });
  });

  it('stays closed until a meeting is opened', () => {
    renderModal();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('shows the prep surface for the opened meeting', () => {
    renderModal();

    act(() => {
      useMeetingPrepModal.getState().open(session);
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', {name: 'Design review'})).toBeInTheDocument();
  });

  it('closes from Cancel, Escape, and the overlay', async () => {
    renderModal();
    act(() => {
      useMeetingPrepModal.getState().open(session);
    });

    fireEvent.click(screen.getByRole('button', {name: 'modalConfirmSecondary'}));
    await expectClosed();

    act(() => {
      useMeetingPrepModal.getState().open(session);
    });
    const content = screen.getByRole('dialog').firstElementChild;
    if (content === null) {
      throw new Error('Expected modal content element');
    }
    fireEvent.keyDown(content, {key: KEY.ESC});
    await expectClosed();

    act(() => {
      useMeetingPrepModal.getState().open(session);
    });
    fireEvent.click(screen.getByRole('dialog'));
    await expectClosed();
  });

  it('joins with the chosen camera and microphone, then closes', async () => {
    const joinMeeting = jest.fn().mockResolvedValue(true);
    renderModal(joinMeeting);
    act(() => {
      useMeetingPrepModal.getState().open(session);
    });

    fireEvent.click(screen.getByRole('button', {name: 'preferencesAVCamera'}));
    fireEvent.click(screen.getByRole('button', {name: 'callJoin'}));

    await waitFor(() => {
      expect(joinMeeting).toHaveBeenCalledWith(session.qualifiedConversationId, {
        cameraEnabled: false,
        microphoneEnabled: true,
      });
    });
    await expectClosed();
  });

  it('stays open when the join does not start', async () => {
    const joinMeeting = jest.fn().mockResolvedValue(false);
    renderModal(joinMeeting);
    act(() => {
      useMeetingPrepModal.getState().open(session);
    });

    fireEvent.click(screen.getByRole('button', {name: 'callJoin'}));

    await waitFor(() => {
      expect(joinMeeting).toHaveBeenCalledTimes(1);
    });
    expect(screen.getByRole('heading', {name: 'Design review'})).toBeInTheDocument();
  });
});
