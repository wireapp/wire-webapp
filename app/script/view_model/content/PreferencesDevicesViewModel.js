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
  constructor(elementId, preferencesDeviceDetails, clientRepository, conversationRepository, cryptographyRepository) {
    this.clickOnRemoveDevice = this.clickOnRemoveDevice.bind(this);
    this.clickOnShowDevice = this.clickOnShowDevice.bind(this);
    this.updateDeviceInfo = this.updateDeviceInfo.bind(this);

    this.preferencesDeviceDetails = preferencesDeviceDetails;
    this.clientRepository = clientRepository;
    this.conversationRepository = conversationRepository;
    this.cryptographyRepository = cryptographyRepository;
    this.logger = new z.util.Logger('z.ViewModel.content.PreferencesDevicesViewModel', z.config.LOGGER.OPTIONS);

    this.currentClient = this.clientRepository.currentClient;
    this.displayClientId = ko.pureComputed(() => (this.currentClient() ? this.currentClient().formatId() : []));

    this.activationLocation = ko.observable([]);
    this.activationDate = ko.observable([]);
    this.devices = ko.observableArray();
    this.displayFingerPrint = ko.observable();

    this.shouldUdateScrollbar = ko.computed(() => this.devices()).extend({notify: 'always', rateLimit: 500});

    this._updateActivationLocation('?');

    // All clients except the current client
    this.clientRepository.clients.subscribe(clientEntities => {
      const devices = clientEntities.filter(clientEntity => clientEntity.id !== this.currentClient().id);
      this.devices(devices);
    });
  }

  _updateActivationDate(time, template = z.string.preferences_devices_activated_on) {
    const formattedTime = z.util.format_timestamp(time);
    const sanitizedText = z.util.StringUtil.splitAtPivotElement(template, '{{date}}', formattedTime);
    this.activationDate(sanitizedText);
  }

  _updateActivationLocation(location, template = z.string.preferences_devices_activated_in) {
    const sanitizedText = z.util.StringUtil.splitAtPivotElement(template, '{{location}}', location);
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

  clickOnShowDevice(clientEntity) {
    this.preferencesDeviceDetails.device(clientEntity);
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS);
  }

  clickOnRemoveDevice(clientEntity, event) {
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.REMOVE_DEVICE, {
      action: password => this.clientRepository.deleteClient(clientEntity.id, password),
      data: clientEntity.model,
    });
    event.stopPropagation();
  }

  updateDeviceInfo() {
    if (this.currentClient() && !this.displayFingerPrint()) {
      const {location, time} = this.currentClient();
      this._updateActivationDate(time);
      if (location) {
        this._updateLocation(location);
      }

      const paddedFingerPrint = z.util.zero_padding(this.cryptographyRepository.getLocalFingerprint(), 16);
      this.displayFingerPrint(paddedFingerPrint.match(/.{1,2}/g) || []);
    }
  }
};
