/*
 * Wire
 * Copyright (C) 2020 Wire Swiss GmbH
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
import {css, SerializedStyles} from '@emotion/react';
export interface DeviceToggleButtonProps {
  currentDevice: string;
  devices: string[];
  onChooseDevice: (deviceId: string) => void;
  styles?: SerializedStyles;
}

const DeviceToggleButton: React.FC<DeviceToggleButtonProps> = ({currentDevice, devices, onChooseDevice, styles}) => {
  const selectNextDevice = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    event.preventDefault();
    event.stopPropagation();
    const currentDeviceIndex = devices.indexOf(currentDevice);
    const newDeviceIndex = (currentDeviceIndex + 1) % devices.length;
    const newDeviceId = devices[newDeviceIndex];
    onChooseDevice(newDeviceId);
  };

  return (
    <div
      data-uie-name="device-toggle-button"
      css={css`
        align-items: center;
        flex-direction: column;
        color: #fff;
        cursor: pointer;
        display: inline-flex;
        ${styles};
      `}
    >
      <div
        className="device-toggle-button-indicator"
        data-uie-name="device-toggle-button-indicator"
        onClick={selectNextDevice}
        css={{
          display: 'flex',
          marginTop: 8,
        }}
      >
        {devices.map(device => (
          <span
            key={device}
            className="device-toggle-button-indicator-dot"
            data-uie-name="device-toggle-button-indicator-dot"
            data-uie-value={device === currentDevice ? 'active' : 'inactive'}
            css={{
              '&:not(:last-child)': {marginRight: 8},
              backgroundColor: device === currentDevice ? 'currentColor' : 'var(--foreground-fade-24)',
              borderRadius: '50%',
              color: '#fff',
              display: 'inline-block',
              height: 8,
              width: 8,
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default DeviceToggleButton;
