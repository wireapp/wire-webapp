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
window.z.ViewModel = z.ViewModel || {};
window.z.ViewModel.content = z.ViewModel.content || {};

z.ViewModel.content.PreferencesDevicesViewModel = class PreferencesDevicesViewModel {
  constructor(
    element_id,
    preferences_device_details,
    client_repository,
    conversation_repository,
    cryptography_repository
  ) {
    this.click_on_remove_device = this.click_on_remove_device.bind(this);
    this.click_on_show_device = this.click_on_show_device.bind(this);
    this.update_device_info = this.update_device_info.bind(this);

    this.preferences_device_details = preferences_device_details;
    this.client_repository = client_repository;
    this.conversation_repository = conversation_repository;
    this.cryptography_repository = cryptography_repository;
    this.logger = new z.util.Logger('z.ViewModel.content.PreferencesDevicesViewModel', z.config.LOGGER.OPTIONS);

    this.self_user = this.client_repository.self_user;

    this.current_client = this.client_repository.currentClient;
    this.displayClientId = ko.pureComputed(() => (this.current_client() ? this.current_client().formatId() : []));

    this.activated_in = ko.observable([]);
    this.activated_on = ko.observable([]);
    this.devices = ko.observableArray();
    this.displayFingerPrint = ko.observable();

    this.should_update_scrollbar = ko.computed(() => this.devices()).extend({notify: 'always', rateLimit: 500});

    this._update_activation_location('?');

    // All clients except the current client
    this.client_repository.clients.subscribe(client_ets => {
      const devices = client_ets.filter(client_et => client_et.id !== this.current_client().id);
      this.devices(devices);
    });
  }

  _update_activation_location(location, template = z.string.preferences_devices_activated_in) {
    const sanitizedText = z.util.StringUtil.splitAtPivotElement(template, '{{location}}', location);
    this.activated_in(sanitizedText);
  }

  _update_activation_time(time, template = z.string.preferences_devices_activated_on) {
    const formattedTime = z.util.format_timestamp(time);
    const sanitizedText = z.util.StringUtil.splitAtPivotElement(template, '{{date}}', formattedTime);
    this.activated_on(sanitizedText);
  }

  _update_device_location(location) {
    z.location.getLocation(location.lat, location.lon).then(retrieved_location => {
      if (retrieved_location) {
        this._update_activation_location(`${retrieved_location.place}, ${retrieved_location.countryCode}`);
      }
    });
  }

  click_on_show_device(device_et) {
    this.preferences_device_details.device(device_et);
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS);
  }

  click_on_remove_device(device_et, event) {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.REMOVE_DEVICE, {
      action: password => {
        this.client_repository.deleteClient(device_et.id, password);
      },
      data: device_et.model,
    });
    event.stopPropagation();
  }

  update_device_info() {
    if (this.current_client() && !this.displayFingerPrint()) {
      if (this.current_client().location) {
        this._update_device_location(this.current_client().location);
      }

      this._update_activation_time(this.current_client().time);
      this.displayFingerPrint(
        z.util.zero_padding(this.cryptography_repository.getLocalFingerprint(), 16).match(/.{1,2}/g)
      );
    }
  }
};
