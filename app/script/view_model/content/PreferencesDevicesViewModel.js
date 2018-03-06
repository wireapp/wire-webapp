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
window.z.viewModel = z.viewModel || {};
window.z.viewModel.content = z.viewModel.content || {};

z.viewModel.content.PreferencesDevicesViewModel = class PreferencesDevicesViewModel {
  constructor(mainViewModel, contentViewModel, repositories) {
    this.clickOnRemoveDevice = this.clickOnRemoveDevice.bind(this);
    this.clickOnShowDevice = this.clickOnShowDevice.bind(this);
    this.updateDeviceInfo = this.updateDeviceInfo.bind(this);

    this.clientRepository = repositories.client;
    this.conversationRepository = repositories.conversation;
    this.cryptographyRepository = repositories.cryptography;
    this.logger = new z.util.Logger('z.viewModel.content.PreferencesDevicesViewModel', z.config.LOGGER.OPTIONS);

    this.actionsViewModel = mainViewModel.actions;
    this.preferencesDeviceDetails = contentViewModel.preferencesDeviceDetails;
    this.currentClient = this.clientRepository.currentClient;
    this.displayClientId = ko.pureComputed(() => (this.currentClient() ? this.currentClient().formatId() : []));

    this.activationLocation = ko.observable([]);
    this.activationDate = ko.observable([]);
    this.devices = ko.observableArray();
    this.localFingerprint = ko.observableArray([]);

    this.shouldUpdateScrollbar = ko.computed(() => this.devices()).extend({notify: 'always', rateLimit: 500});

    this._updateActivationLocation('?');

    // All clients except the current client
    this.clientRepository.clients.subscribe(clientEntities => {
      const devices = clientEntities.filter(clientEntity => clientEntity.id !== this.currentClient().id);
      this.devices(devices);
    });
  }

  _updateActivationDate(time, template = z.string.preferencesDevicesActivatedOn) {
    const formattedTime = z.util.format_timestamp(time);
    const sanitizedText = z.util.StringUtil.splitAtPivotElement(template, '{{date}}', formattedTime);
    this.activationDate(sanitizedText);
  }

  _updateActivationLocation(location, template = z.string.preferencesDevicesActivatedIn) {
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
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICE_DETAILS);
  }

  clickOnRemoveDevice(clientEntity, event) {
    this.actionsViewModel.deleteClient(clientEntity);
    event.stopPropagation();
  }

  updateDeviceInfo() {
    if (this.currentClient() && !this.localFingerprint().length) {
      const {location, time} = this.currentClient();
      this._updateActivationDate(time);
      if (location) {
        this._updateLocation(location);
      }

      this.localFingerprint(this.cryptographyRepository.getLocalFingerprint());
    }
  }
};
