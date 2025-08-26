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

import * as Icon from 'Components/Icon';
import {MediaDevicesHandler} from 'Repositories/media/MediaDevicesHandler';
import {MediaDeviceType} from 'Repositories/media/MediaDeviceType';
import {useKoSubscribableChildren} from 'Util/ComponentUtil';
import {t} from 'Util/LocalizerUtil';

import {DeviceSelect} from './DeviceSelect';

import {PreferencesSection} from '../components/PreferencesSection';

interface AudioOutPreferencesProps {
  devicesHandler: MediaDevicesHandler;
}

const AudioOutPreferences: React.FC<AudioOutPreferencesProps> = ({devicesHandler}) => {
  const {[MediaDeviceType.AUDIO_OUTPUT]: availableDevices} = useKoSubscribableChildren(
    devicesHandler?.availableDevices,
    [MediaDeviceType.AUDIO_OUTPUT],
  );

  const {[MediaDeviceType.AUDIO_OUTPUT]: currentDeviceId} = useKoSubscribableChildren(devicesHandler?.currentDeviceId, [
    MediaDeviceType.AUDIO_OUTPUT,
  ]);

  return (
    <PreferencesSection title={t('preferencesAVSpeakers')}>
      <DeviceSelect
        uieName="enter-speaker"
        onChange={deviceId => devicesHandler.currentDeviceId[MediaDeviceType.AUDIO_OUTPUT](deviceId)}
        devices={availableDevices as MediaDeviceInfo[]}
        value={currentDeviceId}
        icon={Icon.SpeakerIcon}
        defaultDeviceName={t('preferencesAVSpeakers')}
        title={t('preferencesAVSpeakers')}
      />
    </PreferencesSection>
  );
};

export {AudioOutPreferences};
