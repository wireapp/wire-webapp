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

'use strict';

window.z = window.z || {};
window.z.components = z.components || {};

z.components.DeviceCard = class DeviceCard {
  constructor(params, componentInfo) {
    this.device = ko.unwrap(params.device) || {};

    const {class: deviceClass, id, label, location = {}, model} = this.device;
    this.class = deviceClass || '?';
    this.formattedId = id ? this.device.formatId() : [];
    this.id = id || '';
    this.label = label || '?';
    this.model = model || deviceClass || '?'; // devices for other users will only provide the device class

    this.isCurrentClient = params.current || false;
    this.detailed = params.detailed || false;
    this.click = params.click;

    this.dataUieName = `device-card-info${this.isCurrentClient ? '-current' : ''}`;

    this.activationLocation = ko.observableArray([]);

    this._updateActivationLocation('?');
    this._updateLocation(location);

    if (this.detailed || !this.click) {
      $(componentInfo.element).addClass('device-card-no-hover');
    }
    if (this.detailed) {
      $(componentInfo.element).addClass('device-card-detailed');
    }
  }

  clickOnDevice() {
    if (typeof this.click === 'function') {
      this.click(this.device);
    }
  }

  _updateActivationLocation(locationName) {
    const stringTemplate = z.string.preferencesDevicesActivatedIn;
    const sanitizedText = z.util.StringUtil.splitAtPivotElement(stringTemplate, '{{location}}', locationName);
    this.activationLocation(sanitizedText);
  }

  _updateLocation({lat: latitude, lon: longitude}) {
    if (latitude && longitude) {
      z.location.getLocation(latitude, longitude).then(mappedLocation => {
        if (mappedLocation) {
          const {countryCode, place} = mappedLocation;
          this._updateActivationLocation(`${place}, ${countryCode}`);
        }
      });
    }
  }
};

ko.components.register('device-card', {
  template: `
    <div class="device-info" data-bind="click: clickOnDevice,
      attr: {'data-uie-uid': id, 'data-uie-value': label, 'data-uie-name': dataUieName}">
      <!-- ko if: detailed -->
        <div class="label-xs device-label" data-bind="text: label"></div>
        <div class="label-xs">
          <span data-bind="l10n_text: z.string.preferencesDevicesId"></span>
          <span data-bind="foreach: formattedId" data-uie-name="device-id"><span class="device-id-part" data-bind="text: $data"></span></span>
        </div>
        <div class="label-xs" data-bind="foreach: activationLocation"><span data-bind="css: {'preferences-devices-activated-bold': $data.isStyled}, text: $data.text">?</span></div>
        <div class="label-xs" data-bind="text: z.util.format_timestamp(device.time)"></div>
      <!-- /ko -->
      <!-- ko ifnot: detailed -->
        <div class="label-xs">
          <span class="device-model" data-bind="text: model"></span>
          <span class="text-graphite-dark" data-bind="visible: isCurrentClient, l10n_text: z.string.authLimitDevicesCurrent"></span>
        </div>
        <div class="text-graphite-dark label-xs">
          <span data-bind="l10n_text: z.string.preferencesDevicesId"></span>
          <span data-bind="foreach: formattedId" data-uie-name="device-id"><span class="device-id-part" data-bind="text: $data"></span></span>
        </div>
      <!-- /ko -->
    </div>
  `,
  viewModel: {
    createViewModel(params, componentInfo) {
      return new z.components.DeviceCard(params, componentInfo);
    },
  },
});
