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

z.viewModel.content.PreferencesDeviceDetailsViewModel = class PreferencesDeviceDetailsViewModel {
  static get SESSION_RESET_STATE() {
    return {
      CONFIRMATION: 'confirmation',
      ONGOING: 'ongoing',
      RESET: 'reset',
    };
  }

  constructor(mainViewModel, contentViewModel, repositories) {
    this.clientRepository = repositories.client;
    this.conversationRepository = repositories.conversation;
    this.cryptographyRepository = repositories.cryptography;
    this.logger = new z.util.Logger('z.viewModel.content.PreferencesDeviceDetailsViewModel', z.config.LOGGER.OPTIONS);

    this.selfUser = this.clientRepository.selfUser;

    this.activationLocation = ko.observableArray([]);
    this.activationDate = ko.observableArray([]);
    this.device = ko.observable();
    this.fingerprint = ko.observableArray([]);
    this.sessionResetState = ko.observable(PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.RESET);

    this.device.subscribe(clientEntity => {
      if (clientEntity) {
        const {location, time} = clientEntity;
        this.sessionResetState(PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.RESET);

        this._updateFingerprint();
        this._updateActivationLocation('?');
        this._updateActivationTime(time);
        if (location) {
          this._updateLocation(location);
        }
      }
    });
  }

  _updateActivationLocation(location) {
    const stringTemplate = z.string.preferences_devices_activated_in;
    const sanitizedText = z.util.StringUtil.splitAtPivotElement(stringTemplate, '{{location}}', location);
    this.activationLocation(sanitizedText);
  }

  _updateActivationTime(time) {
    const formattedTime = z.util.format_timestamp(time);
    const stringTemplate = z.string.preferences_devices_activated_on;
    const sanitizedText = z.util.StringUtil.splitAtPivotElement(stringTemplate, '{{date}}', formattedTime);
    this.activationDate(sanitizedText);
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

  _updateFingerprint() {
    this.fingerprint([]);

    this.cryptographyRepository.getRemoteFingerprint(this.selfUser().id, this.device().id).then(fingerprint => {
      this.fingerprint(z.util.zero_padding(fingerprint, 16).match(/.{1,2}/g));
    });
  }

  clickOnDetailsClose() {
    amplify.publish(z.event.WebApp.CONTENT.SWITCH, z.viewModel.ContentViewModel.STATE.PREFERENCES_DEVICES);
    this.device(null);
  }

  clickOnResetSession() {
    this.sessionResetState(PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.ONGOING);

    const selfConversationId = this.conversationRepository.self_conversation().id;
    this.conversationRepository
      .reset_session(this.selfUser().id, this.device().id, selfConversationId)
      .then(() => {
        window.setTimeout(() => {
          this.sessionResetState(PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.CONFIRMATION);
        }, z.motion.MotionDuration.LONG);

        window.setTimeout(() => {
          this.sessionResetState(PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.RESET);
        }, 5000);
      })
      .catch(error => {
        this.sessionResetState(PreferencesDeviceDetailsViewModel.SESSION_RESET_STATE.RESET);
        throw error;
      });
  }

  clickOnRemoveDevice() {
    // @todo Add failure case ux WEBAPP-3570
    amplify.publish(z.event.WebApp.WARNING.MODAL, z.viewModel.WarningsViewModel.TYPE.REMOVE_DEVICE, {
      action: password => {
        this.clientRepository
          .deleteClient(this.device().id, password)
          .then(() => this.clickOnDetailsClose())
          .catch(error => amplify.subscribe(z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT));
      },
      data: this.device().model,
    });
  }

  toggleDeviceVerification() {
    const toggleVerified = !this.device().meta.is_verified();
    this.clientRepository.verifyClient(this.selfUser().id, this.device(), toggleVerified);
  }
};
