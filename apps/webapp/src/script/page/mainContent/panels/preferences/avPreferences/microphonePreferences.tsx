/*
 * Wire
 * Copyright (C) 2021 Wire Swiss GmbH
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

import {useEffect, useState} from 'react';

import {useDebouncedCallback} from 'use-debounce';

import * as Icon from 'Components/icon';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';
import {MediaType} from 'Repositories/media/MediaType';
import {useMediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {useApplicationContext} from 'src/script/page/rootProvider';
import {getLogger} from 'Util/logger';

import {DeviceSelect} from './deviceSelect';
import {InputLevel} from './inputLevel';

import {Config} from '../../../../../Config';
import {PreferencesSection} from '../components/preferencesSection';

const logger = getLogger('MicrophonePreferences');

interface MicrophonePreferencesProps {
  devicesHandler: MediaDevicesHandler;
  refreshStream: () => Promise<MediaStream>;
  streamHandler: MediaStreamHandler;
  hasActiveCall: boolean;
}

const DEBOUNCE_TIMEOUT = 100;

const MicrophonePreferences = ({streamHandler, refreshStream, hasActiveCall}: MicrophonePreferencesProps) => {
  const {translate} = useApplicationContext();
  const [isRequesting, setIsRequesting] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const {audioInputDevices, audioInputDeviceId, setAudioInputDeviceId} = useMediaDevicesStore(state => ({
    audioInputDevices: state.audio.input.devices,
    audioInputDeviceId: state.audio.input.selectedId,
    setAudioInputDeviceId: state.setAudioInputDeviceId,
  }));

  const {URL: urls} = Config.getConfig();

  const requestStream = async () => {
    setIsRequesting(true);
    try {
      setStream(await refreshStream());
    } catch (error: unknown) {
      if (error instanceof Error) {
        logger.warn(`Requesting MediaStream for type "${MediaType.AUDIO}" failed: ${error.message}`, error);
      }
      setStream(null);
    } finally {
      setIsRequesting(false);
    }
  };

  // Debounce to handle rapid device changes (removeAllDevices + enumerateDevices)
  const debouncedRequestStream = useDebouncedCallback(requestStream, DEBOUNCE_TIMEOUT);

  useEffect(() => {
    void debouncedRequestStream();
  }, [audioInputDeviceId, audioInputDevices.length, debouncedRequestStream]);

  useEffect(
    () => () => {
      if (stream !== null && stream !== undefined && !hasActiveCall) {
        streamHandler.releaseTracksFromStream(stream);
      }
    },
    [hasActiveCall, stream, streamHandler],
  );

  return (
    <PreferencesSection title={translate('preferencesAVMicrophone')}>
      {stream === null ||
        (stream === undefined && !isRequesting && (
          <div className="preferences-av-detail">
            <a rel="nofollow noopener noreferrer" target="_blank" href={urls.SUPPORT.DEVICE_ACCESS_DENIED}>
              {translate('preferencesAVPermissionDetail')}
            </a>
          </div>
        ))}

      <DeviceSelect
        uieName="enter-microphone"
        devices={audioInputDevices}
        value={audioInputDeviceId}
        defaultDeviceName={translate('preferencesAVMicrophone')}
        icon={Icon.MicOnIcon}
        isRequesting={isRequesting}
        onChange={deviceId => setAudioInputDeviceId(deviceId)}
        title={translate('preferencesAVMicrophone')}
      />
      {isRequesting ? (
        <div className="preferences-av-spinner">
          <div className="icon-spinner spin accent-text"></div>
        </div>
      ) : (
        <InputLevel
          className="preferences-av-meter accent-text"
          disabled={stream === null || stream === undefined}
          mediaStream={stream}
        />
      )}
    </PreferencesSection>
  );
};

export {MicrophonePreferences};
