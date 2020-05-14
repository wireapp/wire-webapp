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

import type {ClientEntity} from '../client/ClientEntity';

interface DeviceRemoveParams {
  cancel?: () => void;
  device: ko.Observable<ClientEntity>;
  error: ko.Observable<Error | false>;
}

class DeviceRemove {
  device_remove_error: ko.Observable<Error | false>;
  device: ClientEntity;
  model?: string;
  params: DeviceRemoveParams;
  password: ko.Observable<string>;
  passwordSubscription: ko.Subscription;
  remove_form_visible: ko.Observable<boolean>;

  constructor(params: DeviceRemoveParams) {
    this.params = params;
    this.device = ko.unwrap(params.device);
    this.device_remove_error = params.error || ko.observable(false);
    this.model = this.device.model;

    this.remove_form_visible = ko.observable(false);

    this.password = ko.observable('');
    this.passwordSubscription = this.password.subscribe(value => {
      if (value.length > 0) {
        return this.device_remove_error(false);
      }
    });
  }

  click_on_submit = function () {
    if (typeof this.params.remove === 'function') {
      this.params.remove(this.password(), this.device);
    }
  };

  click_on_cancel = () => {
    this.remove_form_visible(false);
    if (typeof this.params.cancel === 'function') {
      this.params.cancel();
    }
  };

  click_on_remove_device = () => {
    this.remove_form_visible(true);
  };

  dispose = () => {
    this.passwordSubscription.dispose();
  };
}

ko.components.register('device-remove', {
  template: `
    <!-- ko ifnot: remove_form_visible() -->
      <span class="device-remove-button text-red"
          data-bind="attr: {'data-uie-value': model}, click: click_on_remove_device, text: t('preferencesDevicesRemove')"
          data-uie-name="go-remove-device"></span>
    <!-- /ko -->
    <!-- ko if: remove_form_visible() -->
      <form class="device-remove-form" data-bind="submit: click_on_submit, attr: {'data-uie-value': model}" data-ui-name="device-remove-form">
        <input  class="device-remove-input"
                type="password"
                data-bind="hasfocus: true, textInput: password, attr: {placeholder: t('authPlaceholderPassword')}, css: {'device-remove-input-error': device_remove_error}"
                data-uie-name="remove-device-password" />
        <button class="device-remove-button-remove button button-medium button-fluid"
                data-bind="attr: {'data-uie-value': model}, text: t('preferencesDevicesRemove')"
                data-uie-name="do-remove-device"
                type="submit"></button>
        <button class="device-remove-button text-foreground text-underline"
                data-bind="click: click_on_cancel, text: t('preferencesDevicesRemoveCancel')"
                data-uie-name="remove-device-cancel"></button>
      </form>
    <!-- /ko -->
  `,
  viewModel: {
    createViewModel(params: DeviceRemoveParams) {
      return new DeviceRemove(params);
    },
  },
});
