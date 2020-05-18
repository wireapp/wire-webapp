/*
 * Wire
 * Copyright (C) 2018 Wire Swiss GmbH
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

import ko from 'knockout';

interface Params {
  currentDevice: ko.Observable<string>;
  devices: ko.Observable<string[]>;
  onChooseDevice: (deviceId: string) => void;
}

class DeviceToggleButton {
  private readonly availableDevices: ko.Observable<string[]>;
  private readonly currentDevice: ko.Observable<string>;
  public selectNextDevice: (_: unknown, event: Event) => void;

  constructor({currentDevice, devices, onChooseDevice}: Params) {
    this.availableDevices = devices;
    this.currentDevice = currentDevice;
    this.selectNextDevice = (_: unknown, event: Event) => {
      event.preventDefault();
      event.stopPropagation();
      const currentDeviceIndex = this.availableDevices().indexOf(this.currentDevice());
      const newDeviceIndex = (currentDeviceIndex + 1) % this.availableDevices().length;
      const newDeviceId = this.availableDevices()[newDeviceIndex];
      onChooseDevice(newDeviceId);
    };
  }
}

ko.components.register('device-toggle-button', {
  template: `
    <div class="device-toggle-button-indicator" data-bind="foreach: {data: availableDevices(), as: 'device', noChildContext: true}, click: selectNextDevice">
      <span class="device-toggle-button-indicator-dot" data-bind="css: {'device-toggle-button-indicator-dot-active': device === currentDevice()}"></span>
    </div>
  `,
  viewModel: DeviceToggleButton,
});
