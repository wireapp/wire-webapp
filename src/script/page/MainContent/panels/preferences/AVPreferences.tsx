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

import React from 'react';

import {MediaDeviceType} from 'src/script/media/MediaDeviceType';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {AudioOutPreferences} from './avPreferences/AudioOutPreferences';
import {CallOptions} from './avPreferences/CallOptions';
import {CameraPreferences} from './avPreferences/CameraPreferences';
import {MicrophonePreferences} from './avPreferences/MicrophonePreferences';
import {SaveCallLogs} from './avPreferences/SaveCallLogs';
import {PreferencesPage} from './components/PreferencesPage';

import type {CallingRepository} from '../../../../calling/CallingRepository';
import type {MediaRepository} from '../../../../media/MediaRepository';
import type {PropertiesRepository} from '../../../../properties/PropertiesRepository';

interface AVPreferencesProps {
  callingRepository: CallingRepository;
  mediaRepository: MediaRepository;
  propertiesRepository: PropertiesRepository;
}

const AVPreferences: React.FC<AVPreferencesProps> = ({
  mediaRepository: {devicesHandler, constraintsHandler, streamHandler},
  propertiesRepository,
  callingRepository,
}) => {
  const deviceSupport = useKoSubscribableChildren(devicesHandler?.deviceSupport, [
    MediaDeviceType.AUDIO_INPUT,
    MediaDeviceType.AUDIO_OUTPUT,
    MediaDeviceType.VIDEO_INPUT,
  ]);

  return (
    <PreferencesPage title={t('preferencesAV')}>
      {deviceSupport.audioinput && (
        <MicrophonePreferences
          {...{devicesHandler, streamHandler}}
          refreshStream={() => callingRepository.refreshAudioInput()}
        />
      )}
      {deviceSupport.audiooutput && <AudioOutPreferences {...{devicesHandler}} />}
      {deviceSupport.videoinput && (
        <CameraPreferences
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
