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

import {fireEvent, render, screen} from '@testing-library/react';
import {ThemeProvider} from '@wireapp/react-ui-kit';
import {task} from 'true-myth';

import {mediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import type {Translate} from 'Util/localizerUtil';

import {MeetingPrepSurface} from './meetingPrepSurface';
import {meetingPrepPreviewErrors, type RequestMeetingPrepPreview} from './meetingPrepTypes';

const meetingStartTime = '2026-06-01T09:00:00.000Z';

const translateForPrepTest: Translate = (key, substitutions) =>
  key === 'meetings.notifications.startsAt' ? `Starts at ${String(substitutions?.time)}` : key;

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForPrepTest}),
);

const device = (deviceId: string, label: string): MediaDeviceInfo =>
  ({deviceId, label, kind: 'audioinput', groupId: 'group'}) as MediaDeviceInfo;

const pendingPreview: RequestMeetingPrepPreview = () =>
  task.tryOrElse(
    () => meetingPrepPreviewErrors.requestFailed,
    () => new Promise<MediaStream>(() => undefined),
  );

const renderSurface = (
  overrides: Partial<{
    onCancel: () => void;
    onJoin: (choice: {cameraEnabled: boolean; microphoneEnabled: boolean}) => void;
  }> = {},
) => {
  const onCancel = overrides.onCancel ?? jest.fn();
  const onJoin = overrides.onJoin ?? jest.fn();

  render(
    <ThemeProvider>
      <MeetingPrepSurface
        meetingTitle="Design review"
        meetingStartTime={meetingStartTime}
        participantName="Ada"
        onCancel={onCancel}
        onJoin={onJoin}
        requestPreviewStream={pendingPreview}
        releasePreviewStream={jest.fn()}
      />
    </ThemeProvider>,
    {wrapper: rootProviderWrapper},
  );

  return {onCancel, onJoin};
};

describe('MeetingPrepSurface', () => {
  beforeEach(() => {
    const store = mediaDevicesStore.getState();
    store.resetDevices();
    store.resetSelections();
    store.setAudioInputDevices([device('mic-1', 'Mic 1'), device('mic-2', 'Mic 2')]);
    store.setAudioOutputDevices([device('speaker-1', 'Speaker 1')]);
    store.setVideoInputDevices([device('camera-1', 'Camera 1')]);
    store.setAudioInputDeviceId('mic-1');
    store.setAudioOutputDeviceId('speaker-1');
    store.setVideoInputDeviceId('camera-1');
  });

  it('shows the meeting title, start time, and participant name', () => {
    renderSurface();

    expect(screen.getByRole('heading', {name: 'Design review'})).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText(/Starts at /)).toBeInTheDocument();
  });

  it('leaves without joining from Cancel and from close', () => {
    const {onCancel, onJoin} = renderSurface();

    fireEvent.click(screen.getByRole('button', {name: 'modalConfirmSecondary'}));
    fireEvent.click(screen.getByRole('button', {name: 'meetings.meetNowModal.closeAriaLabel'}));

    expect(onCancel).toHaveBeenCalledTimes(2);
    expect(onJoin).not.toHaveBeenCalled();
  });

  it('joins with the camera and microphone toggles', () => {
    const {onJoin} = renderSurface();

    fireEvent.click(screen.getByRole('button', {name: 'callJoin'}));
    expect(onJoin).toHaveBeenCalledWith({cameraEnabled: true, microphoneEnabled: true});

    fireEvent.click(screen.getByRole('button', {name: 'preferencesAVCamera'}));
    fireEvent.click(screen.getByRole('button', {name: 'preferencesAVMicrophone'}));
    fireEvent.click(screen.getByRole('button', {name: 'callJoin'}));

    expect(onJoin).toHaveBeenLastCalledWith({cameraEnabled: false, microphoneEnabled: false});
  });

  it('writes the chosen microphone to the shared device store', () => {
    renderSurface();

    fireEvent.click(screen.getByRole('button', {name: 'meetings.prepModal.openMicrophoneDevices'}));
    fireEvent.click(screen.getByRole('button', {name: 'Mic 2'}));

    expect(mediaDevicesStore.getState().audio.input.selectedId).toBe('mic-2');
  });
});
