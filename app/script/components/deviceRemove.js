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

window.z = window.z || {};
window.z.components = z.components || {};

z.components.DeviceRemove = class DeviceRemove {
  constructor(params, component_info) {
    this.dispose = this.dispose.bind(this);

    this.device = ko.unwrap(params.device);
    this.device_remove_error = params.error || ko.observable(false);
    this.model = this.device.model;

    this.remove_form_visible = ko.observable(false);

    this.password = ko.observable('');
    this.password_subscription = this.password.subscribe(value => {
      if (value.length > 0) {
        return this.device_remove_error(false);
      }
    });

    this.click_on_submit = function() {
      if (typeof params.remove === 'function') {
        params.remove(this.password(), this.device);
      }
    };

    this.click_on_cancel = () => {
      this.remove_form_visible(false);
      if (typeof params.cancel === 'function') {
        params.cancel();
      }
    };

    this.click_on_remove_device = () => {
      this.remove_form_visible(true);
    };
  }

  dispose() {
    this.password_subscription.dispose();
  }
};

ko.components.register('device-remove', {
  template: `
    <!-- ko ifnot: remove_form_visible() -->
      <span class="device-remove-button text-red"
          data-bind="attr: {'data-uie-value': model}, click: click_on_remove_device, l10n_text: z.string.preferencesDevicesRemove"
          data-uie-name="go-remove-device"></span>
    <!-- /ko -->
    <!-- ko if: remove_form_visible() -->
      <form class="device-remove-form" data-bind="submit: click_on_submit, attr: {'data-uie-value': model}" data-ui-name="device-remove-form">
        <input  class="device-remove-input"
                type="password"
                data-bind="hasfocus: true, textInput: password, l10n_placeholder: z.string.authPlaceholderPasswordPut, css: {'device-remove-input-error': device_remove_error}"
                data-uie-name="remove-device-password" />
        <button class="device-remove-button-remove button button-medium button-fluid"
                data-bind="attr: {'data-uie-value': model}, l10n_text: z.string.preferencesDevicesRemove"
                data-uie-name="do-remove-device"
                type="submit"></button>
        <button class="device-remove-button text-foreground text-underline"
                data-bind="click: click_on_cancel, l10n_text: z.string.preferencesDevicesRemoveCancel"
                data-uie-name="remove-device-cancel"></button>
      </form>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params, component_info) {
      return new z.components.DeviceRemove(params, component_info);
    },
  },
});
