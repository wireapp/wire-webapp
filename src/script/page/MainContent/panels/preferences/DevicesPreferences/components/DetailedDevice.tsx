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

import {DeviceVerificationBadges} from 'Components/VerificationBadge';
import {ClientEntity} from 'src/script/client/ClientEntity';
import {WireIdentity} from 'src/script/E2EIdentity';

import {MLSDeviceDetails} from './MLSDeviceDetails';
import {ProteusDeviceDetails} from './ProteusDeviceDetails';

export interface DeviceProps {
  device: ClientEntity;
  fingerprint: string;
  isCurrentDevice?: boolean;
  getDeviceIdentity?: (deviceId: string) => WireIdentity | undefined;
  isProteusVerified?: boolean;
}

export const DetailedDevice: React.FC<DeviceProps> = ({
  device,
  fingerprint,
  isCurrentDevice,
  getDeviceIdentity,
  isProteusVerified,
}) => {
  const getIdentity = getDeviceIdentity ? () => getDeviceIdentity(device.id) : undefined;
  return (
    <>
      <h3 className="preferences-devices-model preferences-devices-model-name" data-uie-name="device-model">
        <span>{device.model}</span>
        <DeviceVerificationBadges device={device} getIdentity={getIdentity} />
      </h3>

      <MLSDeviceDetails isCurrentDevice={isCurrentDevice} identity={getIdentity?.()} />

      <ProteusDeviceDetails device={device} fingerprint={fingerprint} isProteusVerified={isProteusVerified} />
    </>
  );
};
