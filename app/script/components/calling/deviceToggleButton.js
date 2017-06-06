/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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

'use strict';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.DeviceToggleButton = class DeviceToggleButton {
  constructor(params) {
    this.current_device_index = params.index;
    this.number_of_devices = params.length;
    this.icon_class = params.type === z.media.MediaDeviceType.VIDEO_INPUT
      ? 'icon-video'
      : 'icon-screensharing';
  }
};

ko.components.register('device-toggle-button', {
  template: `
    <div class="device-toggle-button-icon" data-bind="css: icon_class"></div>
    <div class="device-toggle-button-indicator">
      <!-- ko foreach: ko.utils.range(0, number_of_devices() - 1) -->
        <span class="device-toggle-button-indicator-dot" data-bind="css: {'device-toggle-button-indicator-dot-active': $data == $parent.current_device_index()}"></span>
      <!-- /ko -->
    </div>
  `,
  viewModel: z.components.DeviceToggleButton,
});
