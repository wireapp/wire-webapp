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

import {mediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {User} from 'Repositories/entity/User';
import {
  createRootContextValueForTest,
  createRootProviderWrapperForTest,
} from 'src/script/page/testSupport/rootContextTestSupport';
import type {Translate} from 'Util/localizerUtil';

import {MeetingPrepSurface} from './meetingPrepSurface';
import {
  type MeetingPrepDeviceKind,
  meetingPrepDeviceKinds,
  meetingPrepMediaKinds,
  meetingPrepPreviewErrors,
  type RequestMeetingPrepPreview,
} from './meetingPrepTypes';

const meetingStartTime = '2026-06-01T09:00:00.000Z';

const translateForPrepTest: Translate = (key, substitutions) => {
  return key === 'meetings.notifications.startsAt' ? `Starts at ${String(substitutions?.time)}` : key;
};
const participant = new User('self-id', 'example.com', translateForPrepTest);
participant.name('Ada');

const rootProviderWrapper = createRootProviderWrapperForTest(
  createRootContextValueForTest({translate: translateForPrepTest}),
);

const device = (deviceId: string, label: string): MediaDeviceInfo => {
  return {deviceId, label, kind: 'audioinput', groupId: 'group'} as MediaDeviceInfo;
};

const pendingPreview: RequestMeetingPrepPreview = () => {
  return task.tryOrElse(
    () => {
      return meetingPrepPreviewErrors.requestFailed;
    },
    () => {
      return new Promise<MediaStream>(() => {
        return undefined;
      });
    },
  );
};

type RenderSurfaceResult = {
  onCancel: (() => void) | jest.Mock<any, any, any>;
  onPermissionDenied: ((kind: MeetingPrepDeviceKind) => void) | jest.Mock<any, any, any>;
  onJoin:
    jest.Mock<any, any, any> | ((choice: {cameraEnabled: boolean; microphoneEnabled: boolean}) => void | Promise<void>);
};
const renderSurface = (
  overrides: Partial<{
    onCancel: () => void;
    onPermissionDenied: (kind: MeetingPrepDeviceKind) => void;
    onJoin: (choice: {cameraEnabled: boolean; microphoneEnabled: boolean}) => void | Promise<void>;
    requestPreviewStream: RequestMeetingPrepPreview;
  }> = {},
): RenderSurfaceResult => {
  const onCancel = overrides.onCancel ?? jest.fn();
  const onPermissionDenied = overrides.onPermissionDenied ?? jest.fn();
  const onJoin = overrides.onJoin ?? jest.fn();

  render(
    <ThemeProvider>
      <MeetingPrepSurface
        meetingTitle="Design review"
        meetingStartTime={meetingStartTime}
        participant={participant}
        onCancel={onCancel}
        onPermissionDenied={onPermissionDenied}
        onJoin={onJoin}
        requestPreviewStream={overrides.requestPreviewStream ?? pendingPreview}
        releasePreviewStream={jest.fn()}
      />
    </ThemeProvider>,
    {wrapper: rootProviderWrapper},
  );

  return {onCancel, onJoin, onPermissionDenied};
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

  it('joins with the camera and microphone toggles', async () => {
    const {onJoin} = renderSurface();

    fireEvent.click(screen.getByRole('button', {name: 'callJoin'}));
    expect(onJoin).toHaveBeenCalledWith({cameraEnabled: false, microphoneEnabled: false});
    await act(async () => {
      await Promise.resolve();
    });

    fireEvent.click(screen.getByRole('button', {name: 'preferencesAVCamera'}));
    fireEvent.click(screen.getByRole('button', {name: 'preferencesAVMicrophone'}));
    fireEvent.click(screen.getByRole('button', {name: 'callJoin'}));

    expect(onJoin).toHaveBeenLastCalledWith({cameraEnabled: true, microphoneEnabled: true});
    await act(async () => {
      await Promise.resolve();
    });
  });

  it('shows the loading indicator while the camera preview is pending', () => {
    renderSurface();

    fireEvent.click(screen.getByRole('button', {name: 'preferencesAVCamera'}));

    expect(screen.queryByText('callNoCameraAccess')).not.toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(document.querySelector('[data-uie-name="background-effect-initializing"]')).toBeInTheDocument();
  });

  it('hides the camera loading indicator after the preview video can play', async () => {
    const previewStream = {
      getVideoTracks: jest.fn(() => {
        return [];
      }),
    } as unknown as MediaStream;
    const requestPreviewStream: RequestMeetingPrepPreview = () => {
      return task.tryOrElse(
        () => {
          return meetingPrepPreviewErrors.requestFailed;
        },
        () => {
          return Promise.resolve(previewStream);
        },
      );
    };

    renderSurface({requestPreviewStream});
    fireEvent.click(screen.getByRole('button', {name: 'preferencesAVCamera'}));

    const video = await waitFor(() => {
      const element = document.querySelector('video');
      expect(element).toBeInTheDocument();
      return element as HTMLVideoElement;
    });
    expect(document.querySelector('[data-uie-name="background-effect-initializing"]')).toBeInTheDocument();

    fireEvent.canPlay(video);

    await waitFor(() => {
      expect(document.querySelector('[data-uie-name="background-effect-initializing"]')).not.toBeInTheDocument();
    });
  });

  it('shows the loading indicator again after toggling the camera off and on', async () => {
    const previewStream = {
      getVideoTracks: jest.fn(() => {
        return [];
      }),
    } as unknown as MediaStream;
    const requestPreviewStream: RequestMeetingPrepPreview = () => {
      return task.tryOrElse(
        () => {
          return meetingPrepPreviewErrors.requestFailed;
        },
        () => {
          return Promise.resolve(previewStream);
        },
      );
    };

    renderSurface({requestPreviewStream});
    const cameraButton = screen.getByRole('button', {name: 'preferencesAVCamera'});
    fireEvent.click(cameraButton);

    const video = await waitFor(() => {
      const element = document.querySelector('video');
      expect(element).toBeInTheDocument();
      return element as HTMLVideoElement;
    });
    fireEvent.canPlay(video);
    await waitFor(() => {
      expect(document.querySelector('[data-uie-name="background-effect-initializing"]')).not.toBeInTheDocument();
    });

    fireEvent.click(cameraButton);
    fireEvent.click(cameraButton);

    expect(document.querySelector('[data-uie-name="background-effect-initializing"]')).toBeInTheDocument();
  });

  it('turns the camera off when the preview request fails', async () => {
    const requestPreviewStream: RequestMeetingPrepPreview = request => {
      return request.mediaKind === meetingPrepMediaKinds.video
        ? task.tryOrElse(
            () => {
              return meetingPrepPreviewErrors.requestFailed;
            },
            () => {
              return Promise.reject(new Error('camera request failed'));
            },
          )
        : pendingPreview(request);
    };
    const {onJoin} = renderSurface({requestPreviewStream});

    fireEvent.click(screen.getByRole('button', {name: 'preferencesAVCamera'}));

    await waitFor(() => {
      expect(screen.getByRole('button', {name: 'preferencesAVCamera'})).toHaveAttribute('aria-pressed', 'false');
    });
    expect(document.querySelector('[data-uie-name="background-effect-initializing"]')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'callJoin'}));
    expect(onJoin).toHaveBeenCalledWith({cameraEnabled: false, microphoneEnabled: false});
  });

  it('reports a microphone permission failure after enabling the microphone', async () => {
    const onPermissionDenied = jest.fn();
    const requestPreviewStream: RequestMeetingPrepPreview = request => {
      return request.mediaKind === meetingPrepMediaKinds.audio
        ? task.tryOrElse(
            () => {
              return meetingPrepPreviewErrors.microphonePermissionDenied;
            },
            () => {
              return Promise.reject(new Error('microphone permission denied'));
            },
          )
        : pendingPreview(request);
    };

    renderSurface({onPermissionDenied, requestPreviewStream});
    fireEvent.click(screen.getByRole('button', {name: 'preferencesAVMicrophone'}));

    await waitFor(() => {
      expect(onPermissionDenied).toHaveBeenCalledWith(meetingPrepDeviceKinds.microphone);
    });
    expect(screen.getByRole('button', {name: 'preferencesAVMicrophone'})).toHaveAttribute('aria-pressed', 'false');
    expect(document.querySelector('.input-level')).not.toBeInTheDocument();
  });

  it('ignores another Join click while the first request is still running', async () => {
    let finishJoin: () => void = () => {
      return undefined;
    };
    const onJoin = jest.fn(() => {
      return new Promise<void>(resolve => {
        finishJoin = () => {
          return resolve();
        };
      });
    });
    renderSurface({onJoin});

    const joinButton = screen.getByRole('button', {name: 'callJoin'});
    fireEvent.click(joinButton);
    fireEvent.click(joinButton);

    expect(onJoin).toHaveBeenCalledTimes(1);
    expect(joinButton).toBeDisabled();

    await act(async () => {
      finishJoin();
      await Promise.resolve();
    });

    expect(joinButton).toBeEnabled();
  });

  it('writes the chosen microphone to the shared device store', () => {
    renderSurface();

    fireEvent.click(screen.getByRole('button', {name: 'videoCallOverlayOpenMicrophoneAndSpeakerOptions'}));
    fireEvent.click(screen.getByRole('option', {name: 'Mic 2'}));

    expect(mediaDevicesStore.getState().audio.input.activeId).toBe('mic-2');
  });

  it('closes the device list when the pointer goes outside it', () => {
    renderSurface();

    fireEvent.click(screen.getByRole('button', {name: 'videoCallOverlayOpenMicrophoneAndSpeakerOptions'}));
    expect(screen.getByRole('option', {name: 'Mic 2'})).toBeInTheDocument();

    fireEvent.pointerDown(screen.getByRole('heading', {name: 'Design review'}));

    expect(screen.queryByRole('option', {name: 'Mic 2'})).not.toBeInTheDocument();
  });

  it('closes the microphone device list without closing the prep screen on Escape', () => {
    renderSurface();

    fireEvent.click(screen.getByRole('button', {name: 'videoCallOverlayOpenMicrophoneAndSpeakerOptions'}));
    fireEvent.keyDown(screen.getByRole('option', {name: 'Mic 1'}), {key: 'Escape'});

    expect(screen.getByRole('heading', {name: 'Design review'})).toBeInTheDocument();
    expect(screen.queryByRole('option', {name: 'Mic 2'})).not.toBeInTheDocument();
  });

  it('closes the camera device list without closing the prep screen on Escape', () => {
    renderSurface();

    fireEvent.click(screen.getByRole('button', {name: 'videoCallMenuMoreCameraSettings'}));
    fireEvent.keyDown(screen.getByRole('option', {name: 'Camera 1'}), {key: 'Escape'});

    expect(screen.getByRole('heading', {name: 'Design review'})).toBeInTheDocument();
    expect(screen.queryByRole('option', {name: 'Camera 1'})).not.toBeInTheDocument();
  });

  it('keeps only one device list open and removes the preview when the camera is off', () => {
    renderSurface();

    fireEvent.click(screen.getByRole('button', {name: 'videoCallOverlayOpenMicrophoneAndSpeakerOptions'}));
    fireEvent.click(screen.getByRole('button', {name: 'videoCallMenuMoreCameraSettings'}));

    expect(screen.queryByRole('option', {name: 'Mic 2'})).not.toBeInTheDocument();
    expect(screen.getByRole('option', {name: 'Camera 1'})).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', {name: 'preferencesAVCamera'}));
    fireEvent.click(screen.getByRole('button', {name: 'preferencesAVCamera'}));

    expect(screen.getByText('Ada')).toBeInTheDocument();
  });
});
