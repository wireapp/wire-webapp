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
window.z.viewModel.panel = z.viewModel.panel || {};

z.viewModel.panel.ParticipantDevicesViewModel = class ParticipantDevicesViewModel extends z.viewModel.panel
  .BasePanelViewModel {
  static get MODE() {
    return {
      FOUND: 'ParticipantDevicesViewModel.MODE.FOUND',
      NOT_FOUND: 'ParticipantDevicesViewModel.MODE.NOT_FOUND',
      REQUESTING: 'ParticipantDevicesViewModel.MODE.REQUESTING',
    };
  }

  constructor(params) {
    super(params);
    this.clickOnDevice = this.clickOnDevice.bind(this);

    const {client, conversation, cryptography} = params.repositories;
    this.clientRepository = client;
    this.conversationRepository = conversation;
    this.cryptographyRepository = cryptography;

    this.logger = new z.util.Logger('z.viewModel.panel.ParticipantDevicesViewModel', z.config.LOGGER.OPTIONS);

    this.selfClient = this.clientRepository.currentClient;

    this.deviceMode = ko.observable(ParticipantDevicesViewModel.MODE.REQUESTING);
    this.fingerprintLocal = ko.observableArray([]);
    this.fingerprintRemote = ko.observableArray([]);
    this.isResettingSession = ko.observable(false);
    this.showSelfFingerprint = ko.observable(false);
    this.selectedClient = ko.observable();
    this.selectedClientSubscription = undefined;
    this.userEntity = ko.observable();

    this.clientEntities = ko.pureComputed(() => this.userEntity() && this.userEntity().devices());

    this.showDeviceDetails = ko.pureComputed(() => this.selectedClient() && !this.showSelfFingerprint());
    this.showDevicesFound = ko.pureComputed(() => {
      const modeIsFound = this.deviceMode() === ParticipantDevicesViewModel.MODE.FOUND;
      return !this.selectedClient() && !this.showSelfFingerprint() && modeIsFound;
    });
    this.showDevicesNotFound = ko.pureComputed(() => {
      const modeIsNotFound = this.deviceMode() === ParticipantDevicesViewModel.MODE.NOT_FOUND;
      return !this.selectedClient() && !this.showSelfFingerprint() && modeIsNotFound;
    });

    this.detailMessage = ko.pureComputed(() => {
      if (!this.userEntity()) {
        return '';
      }

      const text = z.l10n.text(z.string.participantDevicesDetailHeadline, {user: this.userEntity().first_name()});

      const textWithHtmlTags = /\{\{[^\}]+\}\}[^\{]+\{\{[^\}]+\}\}/;
      const textWithinHtmlTags = /\{\{[^\}]+\}\}/gm;

      const [pivot] = text.match(textWithHtmlTags) || [];
      const sanitizedText = z.util.StringUtil.splitAtPivotElement(text, pivot, pivot);

      return sanitizedText.map(element => {
        if (element.isStyled) {
          element.text = element.text.replace(textWithinHtmlTags, '');
        }
        return element;
      });
    });

    this.devicesHeadlineText = ko.pureComputed(() => {
      return this.userEntity() ? z.l10n.text(z.string.participantDevicesHeadline, this.userEntity().first_name()) : '';
    });

    this.noDevicesHeadlineText = ko.pureComputed(() => {
      return this.userEntity()
        ? z.l10n.text(z.string.participantDevicesOutdatedClientMessage, this.userEntity().first_name())
        : '';
    });

    this.isVisible.subscribe(isVisible => {
      if (isVisible && this.userEntity()) {
        const userId = this.userEntity().id;

        this.clientRepository
          .getClientsByUserId(userId)
          .then(clientEntities => {
            const hasDevices = clientEntities.length > 0;
            const deviceMode = hasDevices
              ? ParticipantDevicesViewModel.MODE.FOUND
              : ParticipantDevicesViewModel.MODE.NOT_FOUND;
            this.deviceMode(deviceMode);
          })
          .catch(error => {
            this.logger.error(`Unable to retrieve clients for user '${userId}': ${error.message || error}`);
          });
      }

      this.selectedClientSubscription = this.selectedClient.subscribe(() => {
        this.fingerprintRemote([]);

        if (this.selectedClient()) {
          this.cryptographyRepository
            .getRemoteFingerprint(this.userEntity().id, this.selectedClient().id)
            .then(remoteFingerprint => this.fingerprintRemote(remoteFingerprint));
        }
      });
    });
    this.shouldUpdateScrollbar = ko
      .computed(() => this.clientEntities() && this.showDeviceDetails() && this.isVisible())
      .extend({notify: 'always', rateLimit: {method: 'notifyWhenChangesStop', timeout: 0}});
  }

  getElementId() {
    return 'participant-devices';
  }

  clickOnBack() {
    if (this.showSelfFingerprint()) {
      return this.showSelfFingerprint(false);
    }

    if (this.selectedClient()) {
      return this.selectedClient(undefined);
    }

    this.onGoBack();
  }

  clickOnDevice(clientEntity) {
    this.selectedClient(clientEntity);
  }

  clickToResetSession() {
    const _resetProgress = () => window.setTimeout(() => this.isResettingSession(false), z.motion.MotionDuration.LONG);

    this.isResettingSession(true);
    this.conversationRepository
      .reset_session(this.userEntity().id, this.selectedClient().id, this.activeConversation().id)
      .then(() => _resetProgress())
      .catch(() => _resetProgress());
  }

  clickOnShowSelfDevices() {
    amplify.publish(z.event.WebApp.PREFERENCES.MANAGE_DEVICES);
  }

  clickToShowSelfFingerprint() {
    if (!this.fingerprintLocal().length) {
      this.fingerprintLocal(this.cryptographyRepository.getLocalFingerprint());
    }
    this.showSelfFingerprint(true);
  }

  clickToToggleDeviceVerification() {
    const toggleVerified = !this.selectedClient().meta.isVerified();

    this.clientRepository
      .verifyClient(this.userEntity().id, this.selectedClient(), toggleVerified)
      .catch(error => this.logger.warn(`Failed to toggle client verification: ${error.message}`));
  }

  initView({entity: userEntity}) {
    this.showSelfFingerprint(false);
    this.selectedClient(undefined);
    this.deviceMode(ParticipantDevicesViewModel.MODE.REQUESTING);

    if (this.selectedClientSubscription) {
      this.selectedClientSubscription.dispose();
    }
    this.userEntity(userEntity);
  }
};
