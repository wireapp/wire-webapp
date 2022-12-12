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
import {splitFingerprint} from 'Util/StringUtil';
import {formatTimestamp} from 'Util/TimeUtil';

import {FormattedId} from './FormattedId';

interface DeviceProps {
  device: ClientEntity;
  fingerprint: string;
}

const DetailedDevice: React.FC<DeviceProps> = ({device, fingerprint}) => {
  return (
    <>
      <h3 className="preferences-devices-model" data-uie-name="device-model">
        {device.model}
      </h3>

      <p className="preferences-devices-id">
      <strong>{t('preferencesDevicesId')}</strong>

        <span data-uie-name="preferences-device-current-id">
          <FormattedId idSlices={splitFingerprint(device.id)} />
        </span>
      </p>

      {device.time !== undefined && (
        <div className="preferences-devices-activated">
          <p
            dangerouslySetInnerHTML={{
              __html: t('preferencesDevicesActivatedOn', {date: formatTimestamp(device.time)}),
            }}
          />
        </div>
      )}

      <h3 className="label preferences-label preferences-devices-fingerprint-label">
        {t('preferencesDevicesFingerprint')}
      </h3>

      <p className="preferences-devices-fingerprint" css={{width: '300px'}}>
        <FormattedId idSlices={splitFingerprint(fingerprint)} />
      </p>
    </>
  );
};

export {DetailedDevice};
