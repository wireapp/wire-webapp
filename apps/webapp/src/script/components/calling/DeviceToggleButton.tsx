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

import {UIEvent} from 'react';

import {css, SerializedStyles} from '@emotion/react';
import {handleKeyDown, KEY} from 'Util/KeyboardUtil';
interface DeviceToggleButtonProps {
  currentDevice: string;
  devices: string[];
  onChooseDevice: (deviceId: string) => void;
  styles?: SerializedStyles;
}

const DeviceToggleButton = ({currentDevice, devices, onChooseDevice, styles}: DeviceToggleButtonProps) => {
  const selectNextDevice = (event: UIEvent) => {
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
        color: #fff;
        cursor: pointer;
        display: inline-flex;
        ${styles};
      `}
    >
      {devices.map(device => {
        const isCurrentDevice = device === currentDevice;

        return (
          <button
            key={device}
            className="device-toggle-button-indicator-dot button-reset-default"
            data-uie-name="device-toggle-button-indicator-dot"
            data-uie-value={isCurrentDevice ? 'active' : 'inactive'}
            onClick={selectNextDevice}
            onKeyDown={event =>
              handleKeyDown({
                event,
                callback: () => selectNextDevice(event),
                keys: [KEY.ENTER, KEY.SPACE],
              })
            }
            css={{
              '&:focus-visible': {
                backgroundColor: isCurrentDevice
                  ? 'var(--toggle-button-hover-bg)'
                  : 'var(--toggle-button-unselected-hover-bg)',
                border: '1px solid var(--accent-color)',
                outline: 'none',
              },
              '&:hover': {
                backgroundColor: isCurrentDevice
                  ? 'var(--toggle-button-hover-bg)'
                  : 'var(--toggle-button-unselected-hover-bg)',
                border: isCurrentDevice
                  ? '1px solid var(--toggle-button-hover-bg)'
                  : '1px solid var(--toggle-button-unselected-hover-border)',
              },

              '&:active': {
                backgroundColor: isCurrentDevice ? 'var(--accent-color)' : 'var(--toggle-button-unselected-bg)',
                border: '1px solid var(--accent-color)',
              },
              '&:not(:last-child)': {marginRight: 5},
              backgroundColor: isCurrentDevice ? 'var(--accent-color)' : 'var(--app-bg-secondary)',
              border: isCurrentDevice ? '1px solid var(--accent-color)' : '1px solid var(--foreground)',
              borderRadius: '50%',
              color: '#fff',
              display: 'flex',
              height: 10,
              marginTop: 8,
              width: 10,
            }}
          />
        );
      })}
    </div>
  );
};

export {DeviceToggleButton};
