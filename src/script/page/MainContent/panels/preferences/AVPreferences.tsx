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

import {useInitializeMediaDevices} from 'Hooks/useInitializeMediaDevices';
import type {CallingRepository} from 'Repositories/calling/CallingRepository';
import {MediaDeviceType} from 'Repositories/media/MediaDeviceType';
import type {MediaRepository} from 'Repositories/media/MediaRepository';
import type {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
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
  mediaRepository: MediaRepository;
  propertiesRepository: PropertiesRepository;
}

const AVPreferences = ({
  mediaRepository: {devicesHandler, constraintsHandler, streamHandler},
  propertiesRepository,
  callingRepository,
}: AVPreferencesProps) => {
  const {shouldReloadCamera} = useCameraReloadOnCallEnd(callingRepository);
  const deviceSupport = useKoSubscribableChildren(devicesHandler?.deviceSupport, [
    MediaDeviceType.AUDIO_INPUT,
    MediaDeviceType.AUDIO_OUTPUT,
    MediaDeviceType.VIDEO_INPUT,
  ]);
  const {isMediaDevicesAreInitialized} = useInitializeMediaDevices(devicesHandler, streamHandler);

  return (
    <PreferencesPage title={t('preferencesAV')}>
      {isMediaDevicesAreInitialized && (
        <div className="preferences-av-spinner-select">
          <div className="icon-spinner spin accent-text"></div>
        </div>
      )}
      {!isMediaDevicesAreInitialized && deviceSupport.audioinput && (
        <MicrophonePreferences
          {...{devicesHandler, streamHandler}}
          refreshStream={() => callingRepository.refreshAudioInput()}
          hasActiveCall={callingRepository.hasActiveCall()}
        />
      )}
      {!isMediaDevicesAreInitialized && deviceSupport.audiooutput && <AudioOutPreferences {...{devicesHandler}} />}
      {!isMediaDevicesAreInitialized && deviceSupport.videoinput && (
        <CameraPreferences
          key={`camera-${shouldReloadCamera}`} // Force remount when call ends
          {...{devicesHandler, streamHandler}}
          refreshStream={() => callingRepository.refreshVideoInput()}
          hasActiveCameraStream={callingRepository.hasActiveCameraStream()}
        />
      )}
      <CallOptions {...{constraintsHandler, propertiesRepository}} />
      {callingRepository.supportsCalling && <SaveCallLogs {...{callingRepository}} />}
    </PreferencesPage>
  );
};

export {AVPreferences};
