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
import {TMP_DecoratedWireIdentity} from 'src/script/E2EIdentity';

import {MLSDeviceDetails} from './MLSDeviceDetails';
import {ProteusDeviceDetails} from './ProteusDeviceDetails';

export interface DeviceProps {
  renderDeviceBadges?: (device: ClientEntity) => React.ReactNode;
  device: ClientEntity;
  fingerprint: string;
  showVerificationStatus?: boolean;
  isCurrentDevice?: boolean;
  getDeviceIdentity?: (deviceId: string) => Promise<TMP_DecoratedWireIdentity | undefined>;
  isProteusVerified?: boolean;
}

export const DetailedDevice: React.FC<DeviceProps> = ({
  renderDeviceBadges,
  device,
  fingerprint,
  showVerificationStatus = true,
  isCurrentDevice,
  getDeviceIdentity,
  isProteusVerified = false,
}) => {
  return (
    <>
      <h3 className="preferences-devices-model preferences-devices-model-name" data-uie-name="device-model">
        <span>{device.model}</span>
        {renderDeviceBadges?.(device)}
      </h3>

      {getDeviceIdentity && (
        <MLSDeviceDetails isCurrentDevice={isCurrentDevice} getDeviceIdentity={() => getDeviceIdentity(device.id)} />
      )}

      <ProteusDeviceDetails
        device={device}
        fingerprint={fingerprint}
        isProteusVerified={isProteusVerified}
        showVerificationStatus={showVerificationStatus}
      />
    </>
  );
};
