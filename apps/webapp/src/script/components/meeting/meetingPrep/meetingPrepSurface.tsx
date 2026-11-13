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

import {type FunctionComponent, useEffect, useRef, useState} from 'react';

import {JSX} from '@emotion/react/jsx-runtime';
import {Maybe, maybe} from 'true-myth';

import {MeetingPrepDevices} from './meetingPrepDevices';
import {getMeetingPrepJoinSentenceKey} from './meetingPrepJoinSentence';
import {MeetingPrepPanel} from './meetingPrepPanel';
import {getCameraHealth, getMeetingPrepSetupCallout, getMicrophoneHealth} from './meetingPrepSetup';
import {
  meetingPrepAvatarStyles,
  meetingPrepBodyStyles,
  meetingPrepCloseButtonStyles,
  meetingPrepControlsRowStyles,
  meetingPrepControlsStyles,
  meetingPrepControlStyles,
  meetingPrepGridStyles,
  meetingPrepHeaderStyles,
  meetingPrepNameStyles,
  meetingPrepNoCameraStyles,
  meetingPrepSelfViewStyles,
  meetingPrepSurfaceStyles,
  meetingPrepToggleStyles,
  meetingPrepVideoStyles,
} from './meetingPrepSurface.styles';
import type {
  MeetingPrepDeviceKind,
  MeetingPrepJoinChoice,
  MeetingPrepMediaKind,
  MeetingPrepPreviewError,
  PlayMeetingPrepSpeakerTest,
  RequestMeetingPrepPreview,
} from './meetingPrepTypes';
import {meetingPrepDeviceKinds, meetingPrepMediaKinds, meetingPrepPreviewErrors} from './meetingPrepTypes';

import type {QualifiedId} from '../../../apiClient/user/qualifiedId';
import {renderNoCameraMessage} from '../../../page/mainContent/panels/preferences/avPreferences/cameraPreferences';
import {useApplicationContext} from '../../../page/rootProvider';
import type {User} from '../../../repositories/entity/User';
import {useMediaDevicesStore} from '../../../repositories/media/useMediaDevicesStore';
import {CloseIcon} from '../../../uiKit/dataDisplay/icon/closeIcon';
import {Loading} from '../../../uiKit/dataDisplay/loading/loading';
import {Avatar, AVATAR_SIZE} from '../../avatar';
import {groupVideoBackgroundInitializingOverlay} from '../../calling/GroupVideoGridTile.styles';
import {useShowLoadingOverlay} from '../../calling/useShowLoadingOverlay';
import {CameraIcon, CameraOffIcon, MicOffIcon, MicOnIcon} from '../../icon';

export type MeetingPrepSurfaceProps = {
  /** The id of the meeting title, which names the dialog around the green room. */
  readonly titleId: string;
  readonly meetingTitle: string;
  readonly meetingStartTime: string;
  readonly meetingEndTime: Maybe<string>;
  readonly isCallInProgress: boolean;
  readonly invitees: readonly User[];
  readonly organizerId: Maybe<QualifiedId>;
  readonly brandName: string;
  readonly supportUrl?: string;
  readonly onTestConnection: Maybe<() => void>;
  readonly participant: User;
  readonly onCancel: () => void;
  readonly onPermissionDenied: (kind: MeetingPrepDeviceKind) => void;
  readonly onJoin: (choice: MeetingPrepJoinChoice) => void | Promise<void>;
  readonly requestPreviewStream: RequestMeetingPrepPreview;
  readonly releasePreviewStream: (stream: MediaStream) => void;
  readonly playSpeakerTest: PlayMeetingPrepSpeakerTest;
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
  titleId,
  meetingTitle,
  meetingStartTime,
  meetingEndTime,
  isCallInProgress,
  invitees,
  organizerId,
  brandName,
  supportUrl,
  onTestConnection,
  participant,
  onCancel,
  onPermissionDenied,
  onJoin,
  requestPreviewStream,
  releasePreviewStream,
  playSpeakerTest,
}: MeetingPrepSurfaceProps) => {
  const {translate} = useApplicationContext();
  const [cameraEnabled, setCameraEnabled] = useState(false);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(false);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const isJoiningRef = useRef(false);
  const reportedCameraPermissionErrorRef = useRef(false);
  const reportedMicrophonePermissionErrorRef = useRef(false);
  const [isJoining, setIsJoining] = useState(false);
  // Kept after the failed preview clears its error, so the callout and the row can still say why the
  // microphone is off. Cleared when the user turns it on again.
  const [microphoneBlocked, setMicrophoneBlocked] = useState(false);
  // Same for a camera that failed to start, until the user turns it on again or picks another camera.
  const [cameraUnavailable, setCameraUnavailable] = useState(false);

  useEffect(() => {
    closeButtonRef.current?.focus();
  }, []);

  const {
    audioInputDevices,
    audioInputDeviceId,
    isAudioInputSelectable,
    setAudioInputDeviceId,
    audioOutputDevices,
    audioOutputDeviceId,
    isAudioOutputSelectable,
    setAudioOutputDeviceId,
    videoInputDevices,
    videoInputDeviceId,
    isVideoInputSelectable,
    setVideoInputDeviceId,
  } = useMediaDevicesStore(state => {
    return {
      audioInputDevices: state.audio.input.devices,
      audioInputDeviceId: state.audio.input.activeId,
      isAudioInputSelectable: state.audio.input.supported,
      setAudioInputDeviceId: state.setAudioInputDeviceId,
      audioOutputDevices: state.audio.output.devices,
      audioOutputDeviceId: state.audio.output.activeId,
      isAudioOutputSelectable: state.audio.output.supported,
      setAudioOutputDeviceId: state.setAudioOutputDeviceId,
      videoInputDevices: state.video.input.devices,
      videoInputDeviceId: state.video.input.activeId,
      isVideoInputSelectable: state.video.input.supported,
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
      if (videoPreview.error.value === meetingPrepPreviewErrors.requestFailed) {
        setCameraUnavailable(true);
      }
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
        setMicrophoneBlocked(true);
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

  const microphoneHealth = getMicrophoneHealth({
    isBlocked: microphoneBlocked,
    isEnabled: microphoneEnabled,
    hasStream: meterStream !== null,
  });
  const cameraHealth = getCameraHealth({
    isUnavailable: cameraUnavailable,
    isEnabled: cameraEnabled,
    hasStream: maybe.isJust(videoPreview.stream),
  });

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
      return <div css={meetingPrepNoCameraStyles}>{renderNoCameraMessage({brandName, translate})}</div>;
    }

    return (
      <div className="group-video__minimized-wrapper--no-camera-access" css={meetingPrepNoCameraStyles}>
        {translate('callNoCameraAccess')}
      </div>
    );
  };

  return (
    <section css={meetingPrepSurfaceStyles} data-uie-name="meeting-prep-surface">
      <header css={meetingPrepHeaderStyles}>
        <button
          type="button"
          ref={closeButtonRef}
          css={meetingPrepCloseButtonStyles}
          onClick={onCancel}
          disabled={isJoining}
          aria-label={translate('meetings.meetNowModal.closeAriaLabel')}
        >
          <CloseIcon aria-hidden="true" />
        </button>
      </header>

      <div css={meetingPrepBodyStyles}>
        <div css={meetingPrepGridStyles}>
          <div>
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
            <div css={meetingPrepControlsRowStyles}>
              <div css={meetingPrepControlsStyles}>
                <div css={meetingPrepControlStyles}>
                  <button
                    type="button"
                    css={meetingPrepToggleStyles}
                    aria-pressed={microphoneEnabled}
                    aria-label={translate('preferencesAVMicrophone')}
                    onClick={() => {
                      setMicrophoneBlocked(false);
                      setMicrophoneEnabled(enabled => {
                        return !enabled;
                      });
                    }}
                  >
                    {microphoneEnabled ? <MicOnIcon /> : <MicOffIcon />}
                  </button>
                </div>
                <div css={meetingPrepControlStyles}>
                  <button
                    type="button"
                    css={meetingPrepToggleStyles}
                    aria-pressed={cameraEnabled}
                    aria-label={translate('preferencesAVCamera')}
                    onClick={() => {
                      setCameraUnavailable(false);
                      setCameraEnabled(enabled => {
                        return !enabled;
                      });
                    }}
                  >
                    {cameraEnabled ? <CameraIcon /> : <CameraOffIcon />}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <MeetingPrepPanel
            titleId={titleId}
            meetingTitle={meetingTitle}
            meetingStartTime={meetingStartTime}
            meetingEndTime={meetingEndTime}
            isCallInProgress={isCallInProgress}
            invitees={invitees}
            organizerId={organizerId}
            deviceSection={
              <MeetingPrepDevices
                callout={getMeetingPrepSetupCallout({microphone: microphoneHealth, camera: cameraHealth})}
                microphone={{
                  devices: audioInputDevices,
                  selectedId: audioInputDeviceId,
                  onSelect: setAudioInputDeviceId,
                  isSelectable: isAudioInputSelectable,
                }}
                speaker={{
                  devices: audioOutputDevices,
                  selectedId: audioOutputDeviceId,
                  onSelect: setAudioOutputDeviceId,
                  isSelectable: isAudioOutputSelectable,
                }}
                camera={{
                  devices: videoInputDevices,
                  selectedId: videoInputDeviceId,
                  onSelect: deviceId => {
                    // Only another camera is a new attempt; picking the failed one again changes nothing.
                    if (deviceId !== videoInputDeviceId) {
                      setCameraUnavailable(false);
                    }
                    setVideoInputDeviceId(deviceId);
                  },
                  isSelectable: isVideoInputSelectable,
                }}
                microphoneHealth={microphoneHealth}
                cameraHealth={cameraHealth}
                microphoneStream={microphoneHealth === 'working' ? Maybe.of(meterStream) : Maybe.nothing()}
                playSpeakerTest={playSpeakerTest}
              />
            }
            brandName={brandName}
            supportUrl={supportUrl}
            onTestConnection={onTestConnection}
            joinSentence={translate(getMeetingPrepJoinSentenceKey({microphoneEnabled, cameraEnabled}))}
            isJoining={isJoining}
            onJoin={join}
          />
        </div>
      </div>
    </section>
  );
};
