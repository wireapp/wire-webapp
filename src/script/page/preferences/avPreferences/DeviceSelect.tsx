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

interface DeviceSelectProps {
  devices: MediaDeviceInfo[];
  value: string;
  disabled?: boolean;
  defaultDeviceName?: string;
  icon: React.ComponentType;
  uieName?: string;
  onChange: (deviceId: string) => void;
}

const DeviceSelect: React.FC<DeviceSelectProps> = ({
  disabled = false,
  devices,
  value,
  defaultDeviceName = '',
  icon: DeviceIcon,
  uieName,
  onChange,
}) => {
  return (
    <div
      className={cx('preferences-option', {
        'preferences-av-select-disabled': disabled,
      })}
    >
      <div className="preferences-option-icon preferences-av-select-icon">
        <DeviceIcon />
      </div>
      <div className="input-select">
        <select
          className={cx('preferences-av-select', {'preferences-av-select-disabled': disabled})}
          name="select"
          disabled={disabled}
          value={value}
          data-uie-name={uieName}
          onChange={({target}) => onChange(target.value)}
        >
          {devices.map(({deviceId, label}) => (
            <option value={deviceId}>{label || defaultDeviceName}</option>
          ))}
        </select>
        {devices.length > 1 && <label className="icon-down preferences-av-label" />}
      </div>
    </div>
  );
};

export default DeviceSelect;
