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

import DeviceToggleButton, {DeviceToggleButtonProps} from './DeviceToggleButton';
import TestPage from 'Util/test/TestPage';

class DeviceToggleButtonPage extends TestPage<DeviceToggleButtonProps> {
  constructor(props?: DeviceToggleButtonProps) {
    super(DeviceToggleButton, props);
  }

  getDots = () => this.get('span[data-uie-name="device-toggle-button-indicator-dot"]');
  getActiveDot = () => this.get('span[data-uie-name="device-toggle-button-indicator-dot-active"]');
  getButton = () => this.get('div[data-uie-name="device-toggle-button-indicator"]');

  clickOnButton = () => this.click(this.getButton());
}

describe('deviceToggleButton', () => {
  it('shows the available devices and highlight the current active device', async () => {
    const devices = ['first', 'second'];
    const deviceToggleButton = new DeviceToggleButtonPage({
      currentDevice: devices[0],
      devices: devices,
      onChooseDevice: () => {},
    });

    const dots = deviceToggleButton.getDots();
    const button = deviceToggleButton.getButton();

    expect(dots.length).toBe(1);
    expect(button.children().length).toBe(devices.length);

    const activeDot = deviceToggleButton.getActiveDot();

    expect(activeDot.exists()).toBe(true);
    expect(activeDot).not.toBe(null);
  });

  it('switches to next device when clicked', () => {
    const devices = ['first', 'second'];
    const props = {
      currentDevice: devices[0],
      devices: devices,
      onChooseDevice: jest.fn(),
    };
    const deviceToggleButton = new DeviceToggleButtonPage(props);

    const button = deviceToggleButton.getButton();

    expect(button.exists()).toBe(true);

    deviceToggleButton.clickOnButton();

    expect(props.onChooseDevice).toHaveBeenCalled();
  });
});
