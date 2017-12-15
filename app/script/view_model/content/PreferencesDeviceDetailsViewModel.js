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
window.z.ViewModel = z.ViewModel || {};
window.z.ViewModel.content = z.ViewModel.content || {};

z.ViewModel.content.PreferencesDeviceDetailsViewModel = class PreferencesDeviceDetailsViewModel {
  static get SESSION_RESET_STATE() {
    return {
      CONFIRMATION: 'confirmation',
      ONGOING: 'ongoing',
      RESET: 'reset',
    };
  }

  constructor(element_id, client_repository, conversation_repository, cryptography_repository) {
    this.client_repository = client_repository;
    this.conversation_repository = conversation_repository;
    this.cryptography_repository = cryptography_repository;
    this.logger = new z.util.Logger('z.ViewModel.content.PreferencesDeviceDetailsViewModel', z.config.LOGGER.OPTIONS);

    this.self_user = this.client_repository.self_user;

    this.device = ko.observable();
    this.device.subscribe(device_et => {
      if (device_et) {
        this.session_reset_state(z.ViewModel.content.PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.RESET);
        this.fingerprint('');
        this._update_fingerprint();
        this._update_activation_location('?');
        this._update_activation_time(device_et.time);
        if (device_et.location) {
          this._update_device_location(device_et.location);
        }
      }
    });

    this.session_reset_state = ko.observable(
      z.ViewModel.content.PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.RESET
    );
    this.fingerprint = ko.observable('');

    this.activated_in = ko.observable(z.l10n.text(z.string.preferences_devices_activated_in));
    this.activated_on = ko.observable(z.l10n.text(z.string.preferences_devices_activated_on));
  }

  _update_activation_location(location) {
    const location_content = `<span class='preferences-devices-activated-bold'>${location}</span>`;
    this.activated_in(z.l10n.text(z.string.preferences_devices_activated_in, location_content));
  }

  _update_activation_time(time) {
    const time_content = `<span class='preferences-devices-activated-bold'>${z.util.format_timestamp(time)}</span>`;
    this.activated_on(z.l10n.text(z.string.preferences_devices_activated_on, time_content));
  }

  _update_device_location(location) {
    z.location.get_location(location.lat, location.lon).then(retrieved_location => {
      if (retrieved_location) {
        this._update_activation_location(`${retrieved_location.place}, ${retrieved_location.country_code}`);
      }
    });
  }

  _update_fingerprint() {
    this.cryptography_repository.get_remote_fingerprint(this.self_user().id, this.device().id).then(fingerprint => {
      this.fingerprint(fingerprint);
    });
  }

  click_on_details_close() {
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES);
    this.device(null);
  }

  click_on_reset_session() {
    this.session_reset_state(z.ViewModel.content.PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.ONGOING);

    this.conversation_repository
      .reset_session(this.self_user().id, this.device().id, this.conversation_repository.self_conversation().id)
      .then(() => {
        window.setTimeout(() => {
          this.session_reset_state(
            z.ViewModel.content.PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.CONFIRMATION
          );
        }, 550);

        window.setTimeout(() => {
          this.session_reset_state(z.ViewModel.content.PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.RESET);
        }, 5000);
      })
      .catch(error => {
        this.session_reset_state(z.ViewModel.content.PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.RESET);
        throw error;
      });
  }

  click_on_remove_device() {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.REMOVE_DEVICE, {
      action: password => {
        // @todo Add failure case ux WEBAPP-3570
        this.client_repository.deleteClient(this.device().id, password).then(() => {
          this.click_on_details_close();
        });
      },
      data: this.device().model,
    });
  }

  toggle_device_verification() {
    const toggle_verified = !this.device().meta.is_verified();
    this.client_repository.verifyClient(this.self_user().id, this.device(), toggle_verified);
  }
};
