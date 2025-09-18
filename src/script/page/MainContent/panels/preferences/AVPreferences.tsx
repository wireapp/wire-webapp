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
import {ElectronDesktopCapturerSource} from 'Repositories/media/MediaDevicesHandler';
import type {MediaDeviceType} from 'Repositories/media/MediaDeviceType';
import type {MediaRepository} from 'Repositories/media/MediaRepository';
import type {PropertiesRepository} from 'Repositories/properties/PropertiesRepository';
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
  deviceSupport: Pick<
    Record<MediaDeviceType, boolean>,
    MediaDeviceType.AUDIO_INPUT | MediaDeviceType.AUDIO_OUTPUT | MediaDeviceType.VIDEO_INPUT
  >;
  availableDevices: (MediaDeviceInfo | ElectronDesktopCapturerSource)[];
  currentDeviceId: string;
}

const AVPreferencesComponent = ({
  mediaRepository: {devicesHandler, constraintsHandler, streamHandler},
  propertiesRepository,
  callingRepository,
  deviceSupport,
  availableDevices,
  currentDeviceId,
}: AVPreferencesProps) => {
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
      {areMediaDevicesInitialized && deviceSupport.audiooutput && <AudioOutPreferences {...{devicesHandler}} />}
      {areMediaDevicesInitialized && deviceSupport.videoinput && (
        <CameraPreferences
          key={`camera-${shouldReloadCamera}`} // Force remount when call ends
          {...{devicesHandler, streamHandler}}
          refreshStream={() => callingRepository.refreshVideoInput()}
          hasActiveCameraStream={callingRepository.hasActiveCameraStream()}
          availableDevices={availableDevices}
          currentDeviceId={currentDeviceId}
        />
      )}
      <CallOptions {...{constraintsHandler, propertiesRepository}} />
      {callingRepository.supportsCalling && <SaveCallLogs {...{callingRepository}} />}
    </PreferencesPage>
  );
};
export const AVPreferences = memo(AVPreferencesComponent);
