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

import {FunctionComponent} from 'react';

import * as Icon from 'Components/Icon';
import {useMediaDevicesStore} from 'Repositories/media/useMediaDevicesStore';
import {t} from 'Util/localizerUtil';

import {DeviceSelect} from './DeviceSelect';

import {PreferencesSection} from '../components/PreferencesSection';

interface AudioOutPreferencesProps {
  refreshCallOutputSpeaker: () => void;
  hasActiveCall: boolean;
}

const AudioOutPreferences: FunctionComponent<AudioOutPreferencesProps> = ({
  refreshCallOutputSpeaker,
  hasActiveCall,
}: AudioOutPreferencesProps) => {
  const {audioOutputDeviceId, setAudioOutputDeviceId, audioOutputDevices} = useMediaDevicesStore(state => ({
    audioOutputDeviceId: state.audio.output.selectedId,
    setAudioOutputDeviceId: state.setAudioOutputDeviceId,
    audioOutputDevices: state.audio.output.devices,
  }));

  const handleChange = (deviceId: string): void => {
    if (deviceId !== audioOutputDeviceId) {
      setAudioOutputDeviceId(deviceId);
      if (hasActiveCall) {
        refreshCallOutputSpeaker();
      }
    }
  };

  return (
    <PreferencesSection title={t('preferencesAVSpeakers')}>
      <DeviceSelect
        uieName="enter-speaker"
        onChange={handleChange}
        devices={audioOutputDevices}
        value={audioOutputDeviceId}
        icon={Icon.SpeakerIcon}
        defaultDeviceName={t('preferencesAVSpeakers')}
        title={t('preferencesAVSpeakers')}
      />
    </PreferencesSection>
  );
};

export {AudioOutPreferences};
