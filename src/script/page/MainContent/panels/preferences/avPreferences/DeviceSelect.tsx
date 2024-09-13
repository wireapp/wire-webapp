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

import cx from 'classnames';

import {Select} from '@wireapp/react-ui-kit';

interface DeviceSelectProps {
  defaultDeviceName?: string;
  devices: MediaDeviceInfo[];
  icon: React.ComponentType;
  isRequesting?: boolean;
  onChange: (deviceId: string) => void;
  title: string;
  uieName: string;
  value: string;
}

const DeviceSelect: React.FC<DeviceSelectProps> = ({
  isRequesting = false,
  devices,
  value,
  defaultDeviceName = '',
  icon: DeviceIcon,
  uieName,
  onChange,
  title,
}) => {
  const devicesList = devices.map(({deviceId, label}) => ({
    label: label || defaultDeviceName,
    value: deviceId,
  }));
  const currentValue = devicesList.find(device => device.value === value);
  const lessThanTwoDevices = devices.length < 2;
  const disabled = lessThanTwoDevices || isRequesting;

  return (
    <div
      className={cx('preferences-option', {
        'preferences-av-select-disabled': disabled,
      })}
      css={{width: '100%'}}
    >
      <div className="preferences-option-icon preferences-av-select-icon">
        <DeviceIcon />
      </div>

      <div css={{width: '100%'}}>
        <Select
          id={uieName}
          onChange={option => {
            const currentOption = option?.value.toString();

            if (currentOption) {
              onChange(currentOption);
            }
          }}
          dataUieName={uieName}
          options={devicesList}
          value={currentValue}
          label={title}
          isDisabled={disabled}
        />
      </div>
    </div>
  );
};

export {DeviceSelect};
