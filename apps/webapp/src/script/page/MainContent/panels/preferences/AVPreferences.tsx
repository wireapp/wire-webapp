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

import {memo} from 'react';

import {useInitializeMediaDevices} from 'Hooks/useInitializeMediaDevices';
import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import {MediaConstraintsHandler} from 'Repositories/media/MediaConstraintsHandler';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import type {MediaDeviceType} from 'Repositories/media/MediaDeviceType';
import {MediaStreamHandler} from 'Repositories/media/MediaStreamHandler';
import type {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {container} from 'tsyringe';
import {t} from 'Util/LocalizerUtil';

import {AudioOutPreferences} from './avPreferences/AudioOutPreferences';
import {CallOptions} from './avPreferences/CallOptions';
import {CameraPreferences} from './avPreferences/CameraPreferences';
import {MicrophonePreferences} from './avPreferences/MicrophonePreferences';
import {SaveCallLogs} from './avPreferences/SaveCallLogs';
import {PreferencesPage} from './components/PreferencesPage';
import {useCameraReloadOnCallEnd} from './useCameraReloadOnCallEnd';

interface AVPreferencesProps {
  callingRepository: CallingRepository;
  propertiesRepository: PropertiesRepository;
  deviceSupport: Pick<
    Record<MediaDeviceType, boolean>,
    MediaDeviceType.AUDIO_INPUT | MediaDeviceType.AUDIO_OUTPUT | MediaDeviceType.VIDEO_INPUT
  >;
}

const AVPreferencesComponent = ({propertiesRepository, callingRepository, deviceSupport}: AVPreferencesProps) => {
  const devicesHandler = container.resolve(MediaDevicesHandler);
  const constraintsHandler = container.resolve(MediaConstraintsHandler);
  const streamHandler = container.resolve(MediaStreamHandler);
  const {shouldReloadCamera} = useCameraReloadOnCallEnd(callingRepository);
  const {areMediaDevicesInitialized} = useInitializeMediaDevices(devicesHandler, streamHandler);

  return (
    <PreferencesPage title={t('preferencesAV')}>
      {!areMediaDevicesInitialized && (
        <div className="preferences-av-spinner-select">
          <div className="icon-spinner spin accent-text"></div>
        </div>
      )}
      {areMediaDevicesInitialized && deviceSupport.audioinput && (
        <MicrophonePreferences
          {...{devicesHandler, streamHandler}}
          refreshStream={() => callingRepository.refreshAudioInput()}
          hasActiveCall={callingRepository.hasActiveCall()}
        />
      )}
      {areMediaDevicesInitialized && deviceSupport.audiooutput && <AudioOutPreferences />}
      {areMediaDevicesInitialized && deviceSupport.videoinput && (
        <CameraPreferences
          key={`camera-${shouldReloadCamera}`} // Force remount when call ends
          {...{streamHandler}}
          refreshStream={() => callingRepository.refreshVideoInput()}
          hasActiveCameraStream={callingRepository.hasActiveCameraStream()}
        />
      )}
      <CallOptions {...{constraintsHandler, propertiesRepository}} />
      {callingRepository.supportsCalling && <SaveCallLogs {...{callingRepository}} />}
    </PreferencesPage>
  );
};
export const AVPreferences = memo(AVPreferencesComponent);
