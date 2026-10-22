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

import {type FunctionComponent, type KeyboardEvent, useEffect, useRef, useState} from 'react';

import {JSX} from '@emotion/react/jsx-runtime';
import {Maybe, maybe} from 'true-myth';

import {Button, ButtonVariant, CloseIcon, Loading} from '@wireapp/react-ui-kit';

import {Avatar, AVATAR_SIZE} from 'Components/avatar';
import {groupVideoBackgroundInitializingOverlay} from 'Components/calling/GroupVideoGridTile.styles';
import {useShowLoadingOverlay} from 'Components/calling/useShowLoadingOverlay';
import {VideoControlsSelect} from 'Components/calling/VideoControls/VideoControlsSelect/VideoControlsSelect';
import {CameraIcon, CameraOffIcon, ChevronIcon, MicOffIcon, MicOnIcon} from 'Components/icon';
import type {User} from 'Repositories/entity/User';
import {useMediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {Config} from 'src/script/Config';
import {renderNoCameraMessage} from 'src/script/page/mainContent/panels/preferences/avPreferences/cameraPreferences';
import {InputLevel} from 'src/script/page/mainContent/panels/preferences/avPreferences/inputLevel';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {formatLocale} from 'Util/timeUtil';

import {
  meetingPrepAvatarStyles,
  meetingPrepBodyStyles,
  meetingPrepCloseButtonStyles,
  meetingPrepControlsStyles,
  meetingPrepControlStyles,
  meetingPrepDeviceMenuStyles,
  meetingPrepFooterStyles,
  meetingPrepHeaderStyles,
  meetingPrepHeaderTextStyles,
  meetingPrepMenuButtonStyles,
  meetingPrepMeterRowStyles,
  meetingPrepMeterStyles,
  meetingPrepNameStyles,
  meetingPrepNoCameraStyles,
  meetingPrepSelfViewStyles,
  meetingPrepSurfaceStyles,
  meetingPrepTimeStyles,
  meetingPrepTitleStyles,
  meetingPrepToggleStyles,
  meetingPrepVideoStyles,
} from './meetingPrepSurface.styles';
import type {
  MeetingPrepDeviceKind,
  MeetingPrepJoinChoice,
  MeetingPrepMediaKind,
  MeetingPrepPreviewError,
  RequestMeetingPrepPreview,
} from './meetingPrepTypes';
import {meetingPrepDeviceKinds, meetingPrepMediaKinds, meetingPrepPreviewErrors} from './meetingPrepTypes';

export type MeetingPrepSurfaceProps = {
  meetingTitle: string;
  meetingStartTime: string;
  participant: User;
  onCancel: () => void;
  onPermissionDenied: (kind: MeetingPrepDeviceKind) => void;
  onJoin: (choice: MeetingPrepJoinChoice) => void | Promise<void>;
  requestPreviewStream: RequestMeetingPrepPreview;
  releasePreviewStream: (stream: MediaStream) => void;
};

type DeviceOption = {
  id: string;
  label: string;
};

const toDeviceOptions = (devices: readonly MediaDeviceInfo[]): DeviceOption[] => {
  return devices.map(device => {
    return {id: device.deviceId, label: device.label};
  });
};

const toSelectDeviceOptions = (
  devices: readonly MediaDeviceInfo[],
  suffix = '',
): (DeviceOption & {value: string})[] => {
  return toDeviceOptions(devices).map(device => {
    return {...device, value: `${device.id}${suffix}`};
  });
};

type MeetingPrepPreviewState = {
  stream: Maybe<MediaStream>;
  error: Maybe<MeetingPrepPreviewError>;
};

const usePreviewStream = (
  enabled: boolean,
  deviceId: string,
  channel: MeetingPrepMediaKind,
  requestPreviewStream: RequestMeetingPrepPreview,
  releasePreviewStream: (stream: MediaStream) => void,
): MeetingPrepPreviewState => {
  const [stream, setStream] = useState<Maybe<MediaStream>>(Maybe.nothing());
  const [error, setError] = useState<Maybe<MeetingPrepPreviewError>>(Maybe.nothing());

  useEffect(() => {
    if (!enabled) {
      setStream(Maybe.nothing());
      setError(Maybe.nothing());
      return undefined;
    }

    let disposed = false;
    let streamToRelease: MediaStream | undefined;
    setError(Maybe.nothing());
    const pendingPreview = requestPreviewStream({
      audio: channel === meetingPrepMediaKinds.audio,
      video: channel === meetingPrepMediaKinds.video,
      mediaKind: channel,
    });

    void pendingPreview.then(result => {
      if (result.isErr || disposed) {
        if (result.isErr && !disposed) {
          setError(Maybe.just(result.error));
        }
        if (result.isOk) {
          releasePreviewStream(result.value);
        }
        return;
      }

      streamToRelease = result.value;
      setStream(Maybe.just(result.value));
    });

    return () => {
      disposed = true;
      if (streamToRelease !== undefined) {
        releasePreviewStream(streamToRelease);
      }
      setStream(Maybe.nothing());
    };
  }, [channel, deviceId, enabled, releasePreviewStream, requestPreviewStream]);

  return {stream, error};
};

export const MeetingPrepSurface: FunctionComponent<MeetingPrepSurfaceProps> = ({
  meetingTitle,
  meetingStartTime,
  participant,
  onCancel,
  onPermissionDenied,
  onJoin,
  requestPreviewStream,
  releasePreviewStream,
}: MeetingPrepSurfaceProps) => {
  const {translate} = useApplicationContext();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const [microphoneMenuOpen, setMicrophoneMenuOpen] = useState(false);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const microphoneMenuRef = useRef<HTMLDivElement | null>(null);
  const cameraMenuRef = useRef<HTMLDivElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const isJoiningRef = useRef(false);
  const reportedCameraPermissionErrorRef = useRef(false);
  const reportedMicrophonePermissionErrorRef = useRef(false);
  const [isJoining, setIsJoining] = useState(false);
  const {
    audioInputDevices,
    audioInputDeviceId,
    setAudioInputDeviceId,
    audioOutputDevices,
    audioOutputDeviceId,
    setAudioOutputDeviceId,
    videoInputDevices,
    videoInputDeviceId,
    setVideoInputDeviceId,
  } = useMediaDevicesStore(state => {
    return {
      audioInputDevices: state.audio.input.devices,
      audioInputDeviceId: state.audio.input.activeId,
      setAudioInputDeviceId: state.setAudioInputDeviceId,
      audioOutputDevices: state.audio.output.devices,
      audioOutputDeviceId: state.audio.output.activeId,
      setAudioOutputDeviceId: state.setAudioOutputDeviceId,
      videoInputDevices: state.video.input.devices,
      videoInputDeviceId: state.video.input.activeId,
      setVideoInputDeviceId: state.setVideoInputDeviceId,
    };
  });
  const audioPreview = usePreviewStream(
    microphoneEnabled,
    audioInputDeviceId,
    meetingPrepMediaKinds.audio,
    requestPreviewStream,
    releasePreviewStream,
  );
  const videoPreview = usePreviewStream(
    cameraEnabled,
    videoInputDeviceId,
    meetingPrepMediaKinds.video,
    requestPreviewStream,
    releasePreviewStream,
  );

  useEffect(() => {
    if (!microphoneMenuOpen && !cameraMenuOpen) {
      return undefined;
    }

    const closeOnOutsidePointer = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }
      const insideMicrophoneMenu = microphoneMenuRef.current?.contains(target) ?? false;
      const insideCameraMenu = cameraMenuRef.current?.contains(target) ?? false;
      if (insideMicrophoneMenu || insideCameraMenu) {
        return;
      }
      setMicrophoneMenuOpen(false);
      setCameraMenuOpen(false);
    };

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    return () => {
      return document.removeEventListener('pointerdown', closeOnOutsidePointer);
    };
  }, [cameraMenuOpen, microphoneMenuOpen]);

  useEffect(() => {
    const videoElement = videoElementRef.current;
    if (videoElement === null) {
      return;
    }

    const previewStream = maybe.isJust(videoPreview.stream) ? videoPreview.stream.value : null;
    if (videoElement.srcObject !== previewStream) {
      videoElement.srcObject = previewStream;
    }
  }, [videoPreview.stream]);

  useEffect(() => {
    const cameraPermissionDenied =
      maybe.isJust(videoPreview.error) && videoPreview.error.value === meetingPrepPreviewErrors.cameraPermissionDenied;
    if (!cameraPermissionDenied) {
      reportedCameraPermissionErrorRef.current = false;
    }

    if (maybe.isJust(videoPreview.error)) {
      setCameraEnabled(false);
      if (cameraPermissionDenied && !reportedCameraPermissionErrorRef.current) {
        reportedCameraPermissionErrorRef.current = true;
        onPermissionDenied(meetingPrepDeviceKinds.camera);
      }
    }

    const microphonePermissionDenied =
      maybe.isJust(audioPreview.error) &&
      audioPreview.error.value === meetingPrepPreviewErrors.microphonePermissionDenied;
    if (!microphonePermissionDenied) {
      reportedMicrophonePermissionErrorRef.current = false;
    }

    if (maybe.isJust(audioPreview.error)) {
      setMicrophoneEnabled(false);
      if (microphonePermissionDenied && !reportedMicrophonePermissionErrorRef.current) {
        reportedMicrophonePermissionErrorRef.current = true;
        onPermissionDenied(meetingPrepDeviceKinds.microphone);
      }
    }
  }, [audioPreview.error, onPermissionDenied, videoPreview.error]);

  const join = (): void => {
    if (isJoiningRef.current) {
      return;
    }

    isJoiningRef.current = true;
    setIsJoining(true);
    void Promise.resolve(onJoin({cameraEnabled, microphoneEnabled})).finally(() => {
      isJoiningRef.current = false;
      setIsJoining(false);
    });
  };

  const audioStream = audioPreview.stream.mapOr(null, stream => {
    return stream;
  });

  const showVideo = cameraEnabled && maybe.isJust(videoPreview.stream);
  const {showLoadingOverlay: showVideoLoadingOverlay, onVideoCanPlay} = useShowLoadingOverlay(
    true,
    showVideo,
    undefined,
  );
  const showLoadingOverlay = showVideoLoadingOverlay || (cameraEnabled && !showVideo);

  const showCameraPermissionError =
    maybe.isJust(videoPreview.error) && videoPreview.error.value === meetingPrepPreviewErrors.cameraPermissionDenied;

  const meterStream =
    microphoneEnabled && audioStream !== null && audioStream.getAudioTracks().length > 0 ? audioStream : null;

  const audioDeviceValue = [
    {
      value: `${audioInputDeviceId}-input`,
      label:
        audioInputDevices.find(device => {
          return device.deviceId === audioInputDeviceId;
        })?.label ?? '',
    },
    {
      value: `${audioOutputDeviceId}-output`,
      label:
        audioOutputDevices.find(device => {
          return device.deviceId === audioOutputDeviceId;
        })?.label ?? '',
    },
  ];

  const audioDeviceOptions = [
    {
      label: translate('videoCallaudioInputMicrophone'),
      options: toSelectDeviceOptions(audioInputDevices, '-input'),
    },
    {
      label: translate('videoCallaudioOutputSpeaker'),
      options: toSelectDeviceOptions(audioOutputDevices, '-output'),
    },
  ];

  const videoDeviceValue = [
    {
      value: videoInputDeviceId,
      label:
        videoInputDevices.find(device => {
          return device.deviceId === videoInputDeviceId;
        })?.label ?? '',
    },
  ];

  const videoDeviceOptions = [
    {
      label: translate('videoCallvideoInputCamera'),
      options: toSelectDeviceOptions(videoInputDevices),
    },
  ];

  const selectAudioDevice = (option: {value?: string | number} | null): void => {
    const value = String(option?.value);
    const deviceId = value.replace(/-(input|output)$/, '');
    if (value.endsWith('-input')) {
      setAudioInputDeviceId(deviceId);
    }
    if (value.endsWith('-output')) {
      setAudioOutputDeviceId(deviceId);
    }
    setMicrophoneMenuOpen(false);
  };

  const selectVideoDevice = (option: {value?: string | number} | null): void => {
    setVideoInputDeviceId(String(option?.value));
    setCameraMenuOpen(false);
  };

  const renderCameraPreview = (): JSX.Element => {
    if (showVideo) {
      return (
        <video
          css={meetingPrepVideoStyles}
          autoPlay
          playsInline
          muted
          ref={videoElementRef}
          onCanPlay={onVideoCanPlay}
        />
      );
    }

    if (showCameraPermissionError) {
      return (
        <div css={meetingPrepNoCameraStyles}>
          {renderNoCameraMessage({brandName: Config.getConfig().BRAND_NAME, translate})}
        </div>
      );
    }

    return (
      <div className="group-video__minimized-wrapper--no-camera-access" css={meetingPrepNoCameraStyles}>
        {translate('callNoCameraAccess')}
      </div>
    );
  };

  const handleKeyDownCapture = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Escape' && (microphoneMenuOpen || cameraMenuOpen)) {
      event.stopPropagation();
      setMicrophoneMenuOpen(false);
      setCameraMenuOpen(false);
    }
  };

  return (
    <section
      css={meetingPrepSurfaceStyles}
      data-uie-name="meeting-prep-surface"
      onKeyDownCapture={handleKeyDownCapture}
    >
      <header css={meetingPrepHeaderStyles}>
        <button
          type="button"
          css={meetingPrepCloseButtonStyles}
          onClick={onCancel}
          disabled={isJoining}
          aria-label={translate('meetings.meetNowModal.closeAriaLabel')}
        >
          <CloseIcon aria-hidden="true" />
        </button>
        <div css={meetingPrepHeaderTextStyles}>
          <h2 css={meetingPrepTitleStyles}>{meetingTitle}</h2>
          <p css={meetingPrepTimeStyles}>
            {translate('meetings.notifications.startsAt', {time: formatLocale(meetingStartTime, 'PP, p')})}
          </p>
        </div>
      </header>

      <div css={meetingPrepBodyStyles}>
        <div css={meetingPrepSelfViewStyles}>
          {!cameraEnabled ? (
            <div css={meetingPrepAvatarStyles}>
              <Avatar participant={participant} avatarSize={AVATAR_SIZE.X_LARGE} hideAvailabilityStatus />
            </div>
          ) : (
            showVideo && renderCameraPreview()
          )}
          {showLoadingOverlay && (
            <div
              aria-busy={showLoadingOverlay}
              css={groupVideoBackgroundInitializingOverlay}
              data-uie-name="background-effect-initializing"
            >
              <Loading size={32} />
            </div>
          )}
          {cameraEnabled && showCameraPermissionError && renderCameraPreview()}
          <span css={meetingPrepNameStyles}>{participant.name()}</span>
        </div>
        <div css={meetingPrepMeterRowStyles}>
          <div css={meetingPrepMeterStyles}>
            {microphoneEnabled && <InputLevel disabled={meterStream === null} mediaStream={meterStream} />}
          </div>
          <div css={meetingPrepControlsStyles}>
            <div css={meetingPrepControlStyles} ref={microphoneMenuRef}>
              <button
                type="button"
                css={meetingPrepToggleStyles}
                aria-pressed={microphoneEnabled}
                aria-label={translate('preferencesAVMicrophone')}
                onClick={() => {
                  return setMicrophoneEnabled(enabled => {
                    return !enabled;
                  });
                }}
              >
                {microphoneEnabled ? <MicOnIcon /> : <MicOffIcon />}
              </button>
              <button
                type="button"
                css={meetingPrepMenuButtonStyles}
                aria-expanded={microphoneMenuOpen}
                aria-label={translate('videoCallOverlayOpenMicrophoneAndSpeakerOptions')}
                onClick={() => {
                  setCameraMenuOpen(false);
                  setMicrophoneMenuOpen(open => {
                    return !open;
                  });
                }}
              >
                <ChevronIcon />
              </button>
              {microphoneMenuOpen && (
                <div css={meetingPrepDeviceMenuStyles}>
                  <VideoControlsSelect
                    value={audioDeviceValue}
                    id="meeting-prep-audio-devices"
                    dataUieName="meeting-prep-audio-devices"
                    options={audioDeviceOptions}
                    menuIsOpen
                    overlayMenu={false}
                    onChange={selectAudioDevice}
                    onKeyDown={event => {
                      if (event.key === 'Escape') {
                        event.stopPropagation();
                        setMicrophoneMenuOpen(false);
                      }
                    }}
                  />
                </div>
              )}
            </div>
            <div css={meetingPrepControlStyles} ref={cameraMenuRef}>
              <button
                type="button"
                css={meetingPrepToggleStyles}
                aria-pressed={cameraEnabled}
                aria-label={translate('preferencesAVCamera')}
                onClick={() => {
                  return setCameraEnabled(enabled => {
                    return !enabled;
                  });
                }}
              >
                {cameraEnabled ? <CameraIcon /> : <CameraOffIcon />}
              </button>
              <button
                type="button"
                css={meetingPrepMenuButtonStyles}
                aria-expanded={cameraMenuOpen}
                aria-label={translate('videoCallMenuMoreCameraSettings')}
                onClick={() => {
                  setMicrophoneMenuOpen(false);
                  setCameraMenuOpen(open => {
                    return !open;
                  });
                }}
              >
                <ChevronIcon />
              </button>
              {cameraMenuOpen && (
                <div css={meetingPrepDeviceMenuStyles}>
                  <VideoControlsSelect
                    value={videoDeviceValue}
                    id="meeting-prep-video-devices"
                    dataUieName="meeting-prep-video-devices"
                    options={videoDeviceOptions}
                    menuIsOpen
                    overlayMenu={false}
                    onChange={selectVideoDevice}
                    onKeyDown={event => {
                      if (event.key === 'Escape') {
                        event.stopPropagation();
                        setCameraMenuOpen(false);
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer css={meetingPrepFooterStyles}>
        <Button type="button" variant={ButtonVariant.TERTIARY} disabled={isJoining} onClick={onCancel}>
          {translate('modalConfirmSecondary')}
        </Button>
        <Button type="button" variant={ButtonVariant.PRIMARY} disabled={isJoining} onClick={join}>
          {translate('callJoin')}
        </Button>
      </footer>
    </section>
  );
};
