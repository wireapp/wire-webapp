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

z.viewModel.panel.ParticipantDevicesViewModel = class ParticipantDevicesViewModel {
  static get MODE() {
    return {
      FOUND: 'ParticipantDevicesViewModel.MODE.FOUND',
      NOT_FOUND: 'ParticipantDevicesViewModel.MODE.NOT_FOUND',
      REQUESTING: 'ParticipantDevicesViewModel.MODE.REQUESTING',
    };
  }

  constructor(mainViewModel, panelViewModel, repositories) {
    this.clickOnDevice = this.clickOnDevice.bind(this);

    this.panelViewModel = panelViewModel;
    this.clientRepository = repositories.client;
    this.cryptographyRepository = repositories.cryptography;
    this.conversationRepository = repositories.conversation;
    this.logger = new z.util.Logger('z.viewModel.panel.ParticipantDevicesViewModel', z.config.LOGGER.OPTIONS);

    this.conversationEntity = this.conversationRepository.active_conversation;
    this.previousState = this.panelViewModel.previousState;
    this.selfClient = this.clientRepository.currentClient;

    this.deviceMode = ko.observable(ParticipantDevicesViewModel.MODE.REQUESTING);
    this.fingerprintLocal = ko.observableArray([]);
    this.fingerprintRemote = ko.observableArray([]);
    this.isResettingSession = ko.observable(false);
    this.showSelfFingerprint = ko.observable(false);
    this.selectedClient = ko.observable();
    this.selectedClientSubscription = undefined;
    this.userEntity = ko.observable();

    this.isVisible = ko.pureComputed(() => this.panelViewModel.participantDevicesVisible() && this.userEntity());

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
      const substitution = {user: z.util.escape_html(this.userEntity().first_name())};
      const text = z.l10n.text(z.string.participantDevicesDetailHeadline, substitution);

      const textWithHtmlTags = new RegExp('\\{\\{[^\\}]+\\}\\}[^\\{]+\\{\\{[^\\}]+\\}\\}');
      const textWithinHtmlTags = new RegExp('\\{\\{[^\\}]+\\}\\}', 'gm');

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
      return z.l10n.text(z.string.participantDevicesHeadline, this.userEntity().first_name());
    });

    this.noDevicesHeadlineText = ko.pureComputed(() => {
      return z.l10n.text(z.string.participantDevicesOutdatedClientMessage, this.userEntity().first_name());
    });

    this.isVisible.subscribe(isVisible => {
      if (isVisible) {
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

  clickOnBack() {
    if (this.showSelfFingerprint()) {
      return this.showSelfFingerprint(false);
    }

    if (this.selectedClient()) {
      return this.selectedClient(undefined);
    }

    const stateWasGroupParticipant = this.previousState() === z.viewModel.PanelViewModel.STATE.GROUP_PARTICIPANT_USER;
    if (stateWasGroupParticipant) {
      return this.panelViewModel.showParticipant(this.userEntity(), true);
    }

    this.panelViewModel.switchState(this.previousState(), true);
  }

  clickOnClose() {
    this.panelViewModel.closePanel().then(didClose => didClose && this.resetView());
  }

  clickOnDevice(clientEntity) {
    this.selectedClient(clientEntity);
  }

  clickToResetSession() {
    const _resetProgress = () => window.setTimeout(() => this.isResettingSession(false), z.motion.MotionDuration.LONG);

    this.isResettingSession(true);
    this.conversationRepository
      .reset_session(this.userEntity().id, this.selectedClient().id, this.conversationEntity().id)
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

  showParticipantDevices(userEntity) {
    this.userEntity(userEntity);
  }

  resetView() {
    this.showSelfFingerprint(false);
    this.selectedClient(undefined);
    this.deviceMode(ParticipantDevicesViewModel.MODE.REQUESTING);

    if (this.selectedClientSubscription) {
      this.selectedClientSubscription.dispose();
    }
  }
};
