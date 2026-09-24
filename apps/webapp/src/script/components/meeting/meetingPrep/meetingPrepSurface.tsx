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

import {useEffect, useRef, useState} from 'react';

import {Maybe, maybe} from 'true-myth';

import {Button, ButtonVariant, CloseIcon} from '@wireapp/react-ui-kit';

import {CameraIcon, CameraOffIcon, ChevronIcon, MicOffIcon, MicOnIcon} from 'Components/icon';
import {useMediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {InputLevel} from 'src/script/page/mainContent/panels/preferences/avPreferences/inputLevel';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {formatLocale} from 'Util/timeUtil';

import {
  meetingPrepBodyStyles,
  meetingPrepCloseButtonStyles,
  meetingPrepControlsStyles,
  meetingPrepControlStyles,
  meetingPrepDeviceButtonStyles,
  meetingPrepFooterStyles,
  meetingPrepHeaderStyles,
  meetingPrepHeaderTextStyles,
  meetingPrepMeterRowStyles,
  meetingPrepMeterStyles,
  meetingPrepMenuButtonStyles,
  meetingPrepMenuLabelStyles,
  meetingPrepMenuStyles,
  meetingPrepNameStyles,
  meetingPrepSelfViewStyles,
  meetingPrepSurfaceStyles,
  meetingPrepTimeStyles,
  meetingPrepTitleStyles,
  meetingPrepToggleStyles,
  meetingPrepVideoStyles,
} from './meetingPrepSurface.styles';
import type {MeetingPrepJoinChoice, RequestMeetingPrepPreview} from './meetingPrepTypes';

export type MeetingPrepSurfaceProps = {
  meetingTitle: string;
  meetingStartTime: string;
  participantName: string;
  onCancel: () => void;
  onJoin: (choice: MeetingPrepJoinChoice) => void;
  requestPreviewStream: RequestMeetingPrepPreview;
  releasePreviewStream: (stream: MediaStream) => void;
};

type DeviceOption = {
  id: string;
  label: string;
};

const toDeviceOptions = (devices: readonly MediaDeviceInfo[]): DeviceOption[] =>
  devices.map(device => ({id: device.deviceId, label: device.label}));

const usePreviewStream = (
  enabled: boolean,
  deviceId: string,
  channel: 'audio' | 'video',
  requestPreviewStream: RequestMeetingPrepPreview,
  releasePreviewStream: (stream: MediaStream) => void,
): Maybe<MediaStream> => {
  const [stream, setStream] = useState<Maybe<MediaStream>>(Maybe.nothing());

  useEffect(() => {
    if (!enabled) {
      setStream(Maybe.nothing());
      return undefined;
    }

    let disposed = false;
    let streamToRelease: MediaStream | undefined;
    const pendingPreview = requestPreviewStream({audio: channel === 'audio', video: channel === 'video'});

    void pendingPreview.then(result => {
      if (result.isErr || disposed) {
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

  return stream;
};

const MeetingPrepDeviceList = ({
  label,
  devices,
  selectedId,
  onSelect,
}: {
  label: string;
  devices: readonly DeviceOption[];
  selectedId: string;
  onSelect: (deviceId: string) => void;
}) => (
  <div>
    <p css={meetingPrepMenuLabelStyles}>{label}</p>
    {devices.map(device => (
      <button
        key={device.id}
        type="button"
        css={meetingPrepDeviceButtonStyles(device.id === selectedId)}
        aria-pressed={device.id === selectedId}
        onClick={() => onSelect(device.id)}
      >
        {device.label}
      </button>
    ))}
  </div>
);

export const MeetingPrepSurface = ({
  meetingTitle,
  meetingStartTime,
  participantName,
  onCancel,
  onJoin,
  requestPreviewStream,
  releasePreviewStream,
}: MeetingPrepSurfaceProps) => {
  const {translate} = useApplicationContext();
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [microphoneMenuOpen, setMicrophoneMenuOpen] = useState(false);
  const [cameraMenuOpen, setCameraMenuOpen] = useState(false);
  const microphoneMenuRef = useRef<HTMLDivElement | null>(null);
  const cameraMenuRef = useRef<HTMLDivElement | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);
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
  } = useMediaDevicesStore(state => ({
    audioInputDevices: state.audio.input.devices,
    audioInputDeviceId: state.audio.input.selectedId,
    setAudioInputDeviceId: state.setAudioInputDeviceId,
    audioOutputDevices: state.audio.output.devices,
    audioOutputDeviceId: state.audio.output.selectedId,
    setAudioOutputDeviceId: state.setAudioOutputDeviceId,
    videoInputDevices: state.video.input.devices,
    videoInputDeviceId: state.video.input.selectedId,
    setVideoInputDeviceId: state.setVideoInputDeviceId,
  }));
  const audioPreview = usePreviewStream(
    microphoneEnabled,
    audioInputDeviceId,
    'audio',
    requestPreviewStream,
    releasePreviewStream,
  );
  const videoPreview = usePreviewStream(
    cameraEnabled,
    videoInputDeviceId,
    'video',
    requestPreviewStream,
    releasePreviewStream,
  );

  useEffect(() => {
    if (!microphoneMenuOpen && !cameraMenuOpen) {
      return undefined;
    }

    const closeOnOutsidePointer = (event: PointerEvent) => {
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
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer);
  }, [cameraMenuOpen, microphoneMenuOpen]);

  useEffect(() => {
    const videoElement = videoElementRef.current;
    if (videoElement === null) {
      return;
    }

    videoElement.srcObject = maybe.isJust(videoPreview) ? videoPreview.value : null;
  }, [videoPreview]);

  const audioStream = audioPreview.mapOr(null, stream => stream);
  const showVideo = cameraEnabled && maybe.isJust(videoPreview);
  const meterStream =
    microphoneEnabled && audioStream !== null && audioStream.getAudioTracks().length > 0 ? audioStream : null;

  return (
    <section css={meetingPrepSurfaceStyles} data-uie-name="meeting-prep-surface">
      <header css={meetingPrepHeaderStyles}>
        <button
          type="button"
          css={meetingPrepCloseButtonStyles}
          onClick={onCancel}
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
        {cameraEnabled && (
          <div css={meetingPrepSelfViewStyles}>
            {showVideo && <video css={meetingPrepVideoStyles} autoPlay playsInline muted ref={videoElementRef} />}
            <span css={meetingPrepNameStyles}>{participantName}</span>
          </div>
        )}
        <div css={meetingPrepMeterRowStyles}>
          <div css={meetingPrepMeterStyles}>
            <InputLevel disabled={!microphoneEnabled || meterStream === null} mediaStream={meterStream} />
          </div>
          <div css={meetingPrepControlsStyles}>
            <div css={meetingPrepControlStyles} ref={microphoneMenuRef}>
              <button
                type="button"
                css={meetingPrepToggleStyles(microphoneEnabled)}
                aria-pressed={microphoneEnabled}
                aria-label={translate('preferencesAVMicrophone')}
                onClick={() => setMicrophoneEnabled(enabled => !enabled)}
              >
                {microphoneEnabled ? <MicOnIcon /> : <MicOffIcon />}
              </button>
              <button
                type="button"
                css={meetingPrepMenuButtonStyles}
                aria-expanded={microphoneMenuOpen}
                aria-label={translate('meetings.prepModal.openMicrophoneDevices')}
                onClick={() => {
                  setCameraMenuOpen(false);
                  setMicrophoneMenuOpen(open => !open);
                }}
              >
                <ChevronIcon />
              </button>
              {microphoneMenuOpen && (
                <div css={meetingPrepMenuStyles}>
                  <MeetingPrepDeviceList
                    label={translate('preferencesAVMicrophone')}
                    devices={toDeviceOptions(audioInputDevices)}
                    selectedId={audioInputDeviceId}
                    onSelect={setAudioInputDeviceId}
                  />
                  <MeetingPrepDeviceList
                    label={translate('preferencesAVSpeakers')}
                    devices={toDeviceOptions(audioOutputDevices)}
                    selectedId={audioOutputDeviceId}
                    onSelect={setAudioOutputDeviceId}
                  />
                </div>
              )}
            </div>
            <div css={meetingPrepControlStyles} ref={cameraMenuRef}>
              <button
                type="button"
                css={meetingPrepToggleStyles(cameraEnabled)}
                aria-pressed={cameraEnabled}
                aria-label={translate('preferencesAVCamera')}
                onClick={() => setCameraEnabled(enabled => !enabled)}
              >
                {cameraEnabled ? <CameraIcon /> : <CameraOffIcon />}
              </button>
              <button
                type="button"
                css={meetingPrepMenuButtonStyles}
                aria-expanded={cameraMenuOpen}
                aria-label={translate('meetings.prepModal.openCameraDevices')}
                onClick={() => {
                  setMicrophoneMenuOpen(false);
                  setCameraMenuOpen(open => !open);
                }}
              >
                <ChevronIcon />
              </button>
              {cameraMenuOpen && (
                <div css={meetingPrepMenuStyles}>
                  <MeetingPrepDeviceList
                    label={translate('preferencesAVCamera')}
                    devices={toDeviceOptions(videoInputDevices)}
                    selectedId={videoInputDeviceId}
                    onSelect={setVideoInputDeviceId}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <footer css={meetingPrepFooterStyles}>
        <Button type="button" variant={ButtonVariant.TERTIARY} onClick={onCancel}>
          {translate('modalConfirmSecondary')}
        </Button>
        <Button
          type="button"
          variant={ButtonVariant.PRIMARY}
          onClick={() => onJoin({cameraEnabled, microphoneEnabled})}
        >
          {translate('callJoin')}
        </Button>
      </footer>
    </section>
  );
};
