/*
 * Wire
 * Copyright (C) 2022 Wire Swiss GmbH
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
import {ClientEntity} from 'src/script/client/ClientEntity';
import {t} from 'Util/LocalizerUtil';
import {formatTimestamp} from 'Util/TimeUtil';
import {splitFingerprint} from 'Util/StringUtil';
import {FormattedId} from './FormattedId';

interface DeviceProps {
  device: ClientEntity;
  fingerprint: string;
}

const DetailedDevice: React.FC<DeviceProps> = ({device, fingerprint}) => {
  return (
    <>
      <div className="preferences-devices-model" data-uie-name="device-model">
        {device.model}
      </div>
      <div className="preferences-devices-id">
        <span>{t('preferencesDevicesId')}</span>
        <span data-uie-name="preferences-device-current-id">
          <FormattedId idSlices={splitFingerprint(device.id)} />
        </span>
      </div>
      <div className="preferences-devices-activated">
        <div
          dangerouslySetInnerHTML={{
            __html: t('preferencesDevicesActivatedOn', {date: formatTimestamp(device.time)}),
          }}
        ></div>
      </div>
      <div className="preferences-devices-fingerprint-label">{t('preferencesDevicesFingerprint')}</div>
      <div className="preferences-devices-fingerprint">
        <FormattedId idSlices={splitFingerprint(fingerprint)} />
      </div>
    </>
  );
};

export default DetailedDevice;
