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
import Icon from 'Components/Icon';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';
import PreferencesSection from '../components/PreferencesSection';
import DeviceSelect from './DeviceSelect';
import {DeviceTypes, MediaDevicesHandler} from '../../../media/MediaDevicesHandler';

interface AudioOutPreferencesProps {
  devicesHandler: MediaDevicesHandler;
}

const AudioOutPreferences: React.FC<AudioOutPreferencesProps> = ({devicesHandler}) => {
  const {[DeviceTypes.AUDIO_OUTPUT]: availableDevices} = useKoSubscribableChildren(devicesHandler?.availableDevices, [
    DeviceTypes.AUDIO_OUTPUT,
  ]);

  const {[DeviceTypes.AUDIO_OUTPUT]: currentDeviceId} = useKoSubscribableChildren(devicesHandler?.currentDeviceId, [
    DeviceTypes.AUDIO_OUTPUT,
  ]);

  return (
    <PreferencesSection title={t('preferencesAVSpeakers')}>
      <DeviceSelect
        uieName="enter-speaker"
        onChange={deviceId => devicesHandler.currentDeviceId[DeviceTypes.AUDIO_OUTPUT](deviceId)}
        devices={availableDevices as MediaDeviceInfo[]}
        value={currentDeviceId}
        icon={Icon.Speaker}
        defaultDeviceName={t('preferencesAVSpeakers')}
        title={t('preferencesAVSpeakers')}
      />
    </PreferencesSection>
  );
};

export default AudioOutPreferences;
