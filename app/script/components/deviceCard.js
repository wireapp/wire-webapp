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

z.components.DeviceCard = class DeviceCard {
  constructor(params, component_info) {
    this.device = ko.unwrap(params.device) || {};

    const {class: device_class, id, label, model} = this.device;
    this.id = id || '';
    this.label = label || '?';
    this.model = model || device_class || '?'; // devices for other users will only provide the device class
    this.class = device_class || '?';

    this.current = params.current || false;
    this.detailed = params.detailed || false;
    this.click = params.click;

    this.data_uie_name = 'device-card-info';
    if (this.current) {
      this.data_uie_name += '-current';
    }

    this.activated_in = ko.observable();

    this._update_activation_location('?');
    this._update_location();

    if (this.detailed || !this.click) {
      $(component_info.element).addClass('device-card-no-hover');
    }
    if (this.detailed) {
      $(component_info.element).addClass('device-card-detailed');
    }
  }

  on_click_device() {
    if (typeof this.click === 'function') {
      this.click(this.device);
    }
  }

  _update_activation_location(location) {
    const location_content = `<span class='label-bold-xs'>${location}</span>`;
    this.activated_in(z.l10n.text(z.string.preferences_devices_activated_in, location_content));
  }

  _update_location() {
    if (this.device && this.device.location) {
      z.location.get_location(this.device.location.lat, this.device.location.lon).then(retrieved_location => {
        if (retrieved_location) {
          this._update_activation_location(`${retrieved_location.place}, ${retrieved_location.country_code}`);
        }
      });
    }
  }
};

ko.components.register('device-card', {
  template: `
    <div class="device-info" data-bind="click: on_click_device,
      attr: {'data-uie-uid': id, 'data-uie-value': label, 'data-uie-name': data_uie_name}">
      <!-- ko if: detailed -->
        <div class="label-xs device-label" data-bind="text: label"></div>
        <div class="label-xs">
          <span data-bind="l10n_text: z.string.preferences_devices_id"></span>
          <span data-uie-name="device-id" data-bind="html: z.util.print_devices_id(id)"></span>
        </div>
        <div class="label-xs" data-bind="html: activated_in"></div>
        <div class="label-xs" data-bind="text: z.util.format_timestamp(device.time)"></div>
      <!-- /ko -->
      <!-- ko ifnot: detailed -->
        <div class="label-xs">
          <span class="device-model" data-bind="text: model"></span>
          <span class="text-graphite-dark" data-bind="visible: current, l10n_text: z.string.auth_limit_devices_current"></span>
        </div>
        <div class="text-graphite-dark label-xs">
          <span data-bind="l10n_text: z.string.preferences_devices_id"></span>
          <span data-uie-name="device-id" data-bind="html: z.util.print_devices_id(id)"></span>
        </div>
      <!-- /ko -->
    </div>
  `,
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.DeviceCard(params, component_info);
    },
  },
});
