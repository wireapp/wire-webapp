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
import {registerReactComponent} from 'Util/ComponentUtil';

export interface DeviceToggleButtonProps {
  currentDevice: string;
  devices: string[];
  onChooseDevice: (deviceId: string) => void;
}

const DeviceToggleButton: React.FC<DeviceToggleButtonProps> = ({currentDevice, devices, onChooseDevice}) => {
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
      className="device-toggle-button-indicator"
      data-uie-name="device-toggle-button-indicator"
      onClick={selectNextDevice}
    >
      {devices.map(device => (
        <span
          key={device}
          className="device-toggle-button-indicator-dot"
          data-uie-name={
            device === currentDevice
              ? 'device-toggle-button-indicator-dot-active'
              : 'device-toggle-button-indicator-dot'
          }
          css={{'device-toggle-button-indicator-dot-active': device === currentDevice}}
        />
      ))}
    </div>
  );
};

export default DeviceToggleButton;

registerReactComponent('device-toggle-button', {
  component: DeviceToggleButton,
  template:
    '<div data-bind="react: {currentDevice: ko.unwrap(currentDevice), devices: ko.unwrap(devices), onChooseDevice}"></div>',
});
