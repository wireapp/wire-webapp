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

import * as Icon from 'Components/Icon';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';
import {MediaType} from 'Repositories/media/MediaType';
import {useMediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {DeviceSelect} from './DeviceSelect';
import {InputLevel} from './InputLevel';

import {Config} from '../../../../../Config';
import {PreferencesSection} from '../components/PreferencesSection';

const logger = getLogger('MicrophonePreferences');

interface MicrophonePreferencesProps {
  devicesHandler: MediaDevicesHandler;
  refreshStream: () => Promise<MediaStream>;
  streamHandler: MediaStreamHandler;
  hasActiveCall: boolean;
}

const MicrophonePreferences = ({streamHandler, refreshStream, hasActiveCall}: MicrophonePreferencesProps) => {
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
    } catch (error) {
      if (error instanceof Error) {
        logger.warn(`Requesting MediaStream for type "${MediaType.AUDIO}" failed: ${error.message}`, error);
      }
      setStream(null);
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    requestStream();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioInputDeviceId]);

  useEffect(
    () => () => {
      if (stream && !hasActiveCall) {
        streamHandler.releaseTracksFromStream(stream);
      }
    },
    [stream],
  );

  return (
    <PreferencesSection title={t('preferencesAVMicrophone')}>
      {!stream && !isRequesting && (
        <div className="preferences-av-detail">
          <a rel="nofollow noopener noreferrer" target="_blank" href={urls.SUPPORT.DEVICE_ACCESS_DENIED}>
            {t('preferencesAVPermissionDetail')}
          </a>
        </div>
      )}

      <DeviceSelect
        uieName="enter-microphone"
        devices={audioInputDevices}
        value={audioInputDeviceId}
        defaultDeviceName={t('preferencesAVMicrophone')}
        icon={Icon.MicOnIcon}
        isRequesting={isRequesting}
        onChange={deviceId => setAudioInputDeviceId(deviceId)}
        title={t('preferencesAVMicrophone')}
      />
      {isRequesting ? (
        <div className="preferences-av-spinner">
          <div className="icon-spinner spin accent-text"></div>
        </div>
      ) : (
        <InputLevel className="preferences-av-meter accent-text" disabled={!stream} mediaStream={stream} />
      )}
    </PreferencesSection>
  );
};

export {MicrophonePreferences};
