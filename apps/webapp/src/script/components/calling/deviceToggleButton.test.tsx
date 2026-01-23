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

import {render, fireEvent} from '@testing-library/react';

import {DeviceToggleButton} from './DeviceToggleButton';

describe('deviceToggleButton', () => {
  const devices = ['first', 'second'];
  it('shows the available devices and highlight the current active device', async () => {
    const props = {
      currentDevice: devices[0],
      devices,
      onChooseDevice: jest.fn(),
    };

    const {container} = render(<DeviceToggleButton {...props} />);

    const dots = container.querySelectorAll('button[data-uie-name="device-toggle-button-indicator-dot"]');
    expect(dots.length).toBe(devices.length);

    const activeDot = container.querySelector('button[data-uie-value="active"]');
    expect(activeDot).not.toBeNull();
  });

  it('switches to next device when clicked', () => {
    const props = {
      currentDevice: devices[0],
      devices,
      onChooseDevice: jest.fn(),
    };

    const {container} = render(<DeviceToggleButton {...props} />);

    const deviceToggleButton = container.querySelector('button[data-uie-name="device-toggle-button-indicator-dot"]');
    expect(deviceToggleButton).not.toBeNull();

    fireEvent.click(deviceToggleButton!);
    expect(props.onChooseDevice).toHaveBeenCalled();
  });
});
