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

import React, {useEffect, useState} from 'react';

import {Icon} from 'Components/Icon';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';

import {DeviceSelect} from './DeviceSelect';
import {InputLevel} from './InputLevel';

import {Config} from '../../../../../Config';
import {DeviceTypes, MediaDevicesHandler} from '../../../../../media/MediaDevicesHandler';
import {MediaStreamHandler} from '../../../../../media/MediaStreamHandler';
import {MediaType} from '../../../../../media/MediaType';
import {PreferencesSection} from '../components/PreferencesSection';

const logger = getLogger('MicrophonePreferences');

interface MicrophonePreferencesProps {
  devicesHandler: MediaDevicesHandler;
  refreshStream: () => Promise<MediaStream>;
  streamHandler: MediaStreamHandler;
}

const MicrophonePreferences: React.FC<MicrophonePreferencesProps> = ({
  devicesHandler,
  streamHandler,
  refreshStream,
}) => {
  const [isRequesting, setIsRequesting] = useState(false);
  const [stream, setStream] = useState<MediaStream>();
  const {[DeviceTypes.AUDIO_INPUT]: availableDevices} = useKoSubscribableChildren(devicesHandler?.availableDevices, [
    DeviceTypes.AUDIO_INPUT,
  ]);

  const {[DeviceTypes.AUDIO_INPUT]: currentDeviceId} = useKoSubscribableChildren(devicesHandler?.currentDeviceId, [
    DeviceTypes.AUDIO_INPUT,
  ]);

  const {URL: urls} = Config.getConfig();

  const requestStream = async () => {
    setIsRequesting(true);
    try {
      setStream(await refreshStream());
    } catch (error) {
      logger.warn(`Requesting MediaStream for type "${MediaType.AUDIO}" failed: ${error.message}`, error);
      setStream(null);
    } finally {
      setIsRequesting(false);
    }
  };

  useEffect(() => {
    requestStream();
  }, [currentDeviceId]);

  useEffect(
    () => () => {
      if (stream) {
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
        devices={availableDevices as MediaDeviceInfo[]}
        value={currentDeviceId}
        defaultDeviceName={t('preferencesAVMicrophone')}
        icon={Icon.MicOn}
        isRequesting={isRequesting}
        onChange={deviceId => devicesHandler.currentDeviceId[DeviceTypes.AUDIO_INPUT](deviceId)}
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
