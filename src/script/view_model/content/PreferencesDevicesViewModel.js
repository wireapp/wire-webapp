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

import Logger from 'utils/Logger';

import {t} from 'utils/LocalizerUtil';
import TimeUtil from 'utils/TimeUtil';

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
    this.userRepository = repositories.user;
    this.logger = new Logger('z.viewModel.content.PreferencesDevicesViewModel', z.config.LOGGER.OPTIONS);

    this.actionsViewModel = mainViewModel.actions;
    this.preferencesDeviceDetails = contentViewModel.preferencesDeviceDetails;
    this.currentClient = this.clientRepository.currentClient;
    this.displayClientId = ko.pureComputed(() => (this.currentClient() ? this.currentClient().formatId() : []));

    this.activationDate = ko.observable();
    this.devices = ko.observableArray();
    this.localFingerprint = ko.observableArray([]);
    this.selfUser = this.userRepository.self;
    this.isSSO = ko.pureComputed(() => this.selfUser() && this.selfUser().isSingleSignOn);

    // All clients except the current client
    this.clientRepository.clients.subscribe(clientEntities => {
      const devices = clientEntities.filter(clientEntity => clientEntity.id !== this.currentClient().id);
      this.devices(devices);
    });
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
      const date = TimeUtil.formatTimestamp(this.currentClient().time);
      this.activationDate(t('preferencesDevicesActivatedOn', {date}));
      this.localFingerprint(this.cryptographyRepository.getLocalFingerprint());
    }
  }
};
