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

import {t} from 'Util/LocalizerUtil';
import {getLogger} from 'Util/Logger';
import {capitalizeFirstChar} from 'Util/StringUtil';

import {amplify} from 'amplify';
import Dexie from 'dexie';
import ko from 'knockout';
import {Config} from '../auth/config';
import {ClientEntity} from '../client/ClientEntity';
import {ClientRepository} from '../client/ClientRepository';
import {ConversationRepository} from '../conversation/ConversationRepository';
import {CryptographyRepository} from '../cryptography/CryptographyRepository';
import {User} from '../entity/User';
import {WebAppEvents} from '../event/WebApp';
import {getPrivacyHowUrl, getPrivacyWhyUrl} from '../externalRoute';
import {MotionDuration} from '../motion/MotionDuration';

import {ClientClassification} from '@wireapp/api-client/dist/commonjs/client';
import 'Components/deviceCard';

export interface UserDevicesHistory {
  current: ko.PureComputed<UserDevicesState>;
  goTo: (to: UserDevicesState, head: string) => void;
  goBack: () => void;
  headline: ko.PureComputed<string>;
}

interface UserDevicesParams {
  clientRepository: ClientRepository;
  conversationRepository: ConversationRepository;
  cryptographyRepository: CryptographyRepository;
  userEntity: ko.Observable<User>;
  history: UserDevicesHistory;
  noPadding?: boolean;
}

enum FIND_MODE {
  FOUND = 'UserDevices.MODE.FOUND',
  NOT_FOUND = 'UserDevices.MODE.NOT_FOUND',
  REQUESTING = 'UserDevices.MODE.REQUESTING',
}

export enum UserDevicesState {
  DEVICE_LIST = 'UserDevices.DEVICE_LIST',
  DEVICE_DETAILS = 'UserDevices.DEVICE_DETAILS',
  SELF_FINGERPRINT = 'UserDevices.SELF_FINGERPRINT',
}

export const makeUserDevicesHistory = (): UserDevicesHistory => {
  const history = ko.observableArray();
  const headlineHistory = ko.observableArray();
  const current = ko.pureComputed(() => history()[history().length - 1]);
  const headline = ko.pureComputed(() => headlineHistory()[headlineHistory().length - 1]);
  history.push(UserDevicesState.DEVICE_LIST);
  return {
    current,
    goBack: () => {
      history.pop();
      headlineHistory.pop();
    },
    goTo: (to: UserDevicesState, head: string) => {
      history.push(to);
      headlineHistory.push(head);
    },
    headline,
  };
};

ko.components.register('user-devices', {
  template: `
    <div>
      <!-- ko if: showDevicesFound() -->
        <div class="participant-devices__header" data-bind="css: {'participant-devices__header--padding': !noPadding}">
          <div class="participant-devices__text-block panel__info-text" data-bind="text: devicesHeadlineText"></div>
          <a class="participant-devices__link" data-bind="attr: {href: privacyWhyUrl}, text: t('participantDevicesWhyVerify')" rel="nofollow noopener noreferrer" target="_blank" class="accent-text"></a>
        </div>

        <div class="participant-devices__device-list" data-bind="foreach: clientEntities()">
          <div class="participant-devices__device-item" data-bind="css: {'participant-devices__device-item--padding': !$parent.noPadding}" data-uie-name="item-device">
            <device-card params="device: $data, click: $parent.clickOnDevice, showVerified: true, showIcon: true"></device-card>
          </div>
        </div>
      <!-- /ko -->

      <!-- ko if: showDevicesNotFound() -->
        <div class="participant-devices__header" data-bind="css: {'participant-devices__header--padding': !noPadding}">
          <div class="participant-devices__text-block panel__info-text" data-bind="text: noDevicesHeadlineText"></div>
          <a class="participant-devices__link" data-bind="text: t('participantDevicesLearnMore'), attr: {href: Config.URL.PRIVACY_POLICY}" rel="nofollow noopener noreferrer" target="_blank" class="accent-text"></a>
        </div>
      <!-- /ko -->

      <!-- ko if: showDeviceDetails() -->
        <div class="participant-devices__header" data-bind="css: {'participant-devices__header--padding': !noPadding}">
          <div class="participant-devices__link participant-devices__show-self-fingerprint accent-text" data-bind="click: clickToShowSelfFingerprint, text: t('participantDevicesDetailShowMyDevice')"></div>
          <div class="panel__info-text" data-bind="html: detailMessage()"></div>
          <a class="participant-devices__link" data-bind="attr: {href: privacyHowUrl}, text: t('participantDevicesDetailHowTo')" rel="nofollow noopener noreferrer" target="_blank" class="accent-text"></a>

        <device-card class="participant-devices__single-client" params="device: selectedClient()"></device-card>
        <div class="participant-devices__fingerprint" data-bind="foreach: fingerprintRemote()" data-uie-name="status-fingerprint">
          <span class="participant-devices__fingerprint__part" data-bind="text: $data"></span>
        </div>

        <div class="participant-devices__verify">
          <div class="slider" data-uie-name="do-toggle-verified">
            <input class="slider-input" type="checkbox" name="toggle" id="toggle" data-bind="checked: selectedClient().meta.isVerified">
            <label class="button-label" for="toggle" data-bind="click: clickToToggleDeviceVerification, text: t('participantDevicesDetailVerify')"></label>
          </div>
          <div class="participant-devices__actions">
            <loading-icon class="accent-fill" data-bind="style: {display : isResettingSession() ? 'initial' : 'none'}" data-uie-name="status-loading"></loading-icon>
            <span class="button-label accent-text ellipsis"
                  data-bind="click: clickToResetSession, style: {display: isResettingSession() ? 'none' : 'initial'}, text: t('participantDevicesDetailResetSession')"
                  data-uie-name="do-reset-session"></span>
          </div>
        </div>
      </div>
      <!-- /ko -->

      <!-- ko if: showSelfFingerprint()-->
        <div class="participant-devices__header" data-bind="css: {'participant-devices__header--padding': !noPadding}">
          <device-card params="device: selfClient()"></device-card>
          <div class="participant-devices__fingerprint" data-bind="foreach: fingerprintLocal()">
            <span class="participant-devices__fingerprint__part" data-bind="text: $data"></span>
          </div>
          <div>
            <span class="participant-devices__link accent-text" data-bind="click: clickOnShowSelfDevices, text: t('participantDevicesSelfAllDevices')"></span>
          </div>
        </div>
      <!-- /ko -->
    </div>
  `,
  viewModel: function({
    clientRepository,
    conversationRepository,
    cryptographyRepository,
    userEntity,
    history: {current, goTo},
    noPadding = false,
  }: UserDevicesParams): void {
    this.selfClient = clientRepository.currentClient;
    this.clientEntities = ko.pureComputed(() => {
      if (userEntity()) {
        const devices = userEntity().devices();
        const legalholdDevices = devices.filter(device => device.class === ClientClassification.LEGAL_HOLD);
        const otherDevices = devices.filter(device => device.class !== ClientClassification.LEGAL_HOLD);
        return legalholdDevices.concat(otherDevices);
      }
      return undefined;
    });
    this.Config = Config;
    this.noPadding = noPadding;

    const logger = getLogger('UserDevices');

    this.isResettingSession = ko.observable(false);
    this.fingerprintLocal = ko.observableArray([]);
    this.fingerprintRemote = ko.observableArray([]);
    this.deviceMode = ko.observable(FIND_MODE.REQUESTING);
    this.selectedClient = ko.observable();
    this.privacyHowUrl = getPrivacyHowUrl();
    this.privacyWhyUrl = getPrivacyWhyUrl();

    const showDeviceList = () => current() === UserDevicesState.DEVICE_LIST;
    this.showDeviceDetails = () => current() === UserDevicesState.DEVICE_DETAILS;
    this.showSelfFingerprint = () => current() === UserDevicesState.SELF_FINGERPRINT;
    this.showDevicesFound = () => showDeviceList() && this.deviceMode() === FIND_MODE.FOUND;
    this.showDevicesNotFound = () => showDeviceList() && this.deviceMode() === FIND_MODE.NOT_FOUND;

    clientRepository
      .getClientsByUserId(userEntity().id)
      .then((clientEntities: ClientEntity[]) => {
        const hasDevices = clientEntities.length > 0;
        const deviceMode = hasDevices ? FIND_MODE.FOUND : FIND_MODE.NOT_FOUND;
        this.deviceMode(deviceMode);
      })
      .catch((error: {message: string}) => {
        this.logger.error(`Unable to retrieve clients for user '${userEntity().id}': ${error.message || error}`);
      });

    this.detailMessage = ko.pureComputed(() => {
      return userEntity() ? t('participantDevicesDetailHeadline', {user: userEntity().first_name()}) : '';
    });

    this.devicesHeadlineText = ko.pureComputed(() => {
      return userEntity()
        ? t('participantDevicesHeadline', {brandName: Config.BRAND_NAME, user: userEntity().first_name()})
        : '';
    });

    this.noDevicesHeadlineText = ko.pureComputed(() => {
      return userEntity()
        ? t('participantDevicesOutdatedClientMessage', {
            brandName: Config.BRAND_NAME,
            user: userEntity().first_name(),
          })
        : '';
    });

    const selectedClientSubscription = this.selectedClient.subscribe(() => {
      this.fingerprintRemote([]);

      if (this.selectedClient()) {
        cryptographyRepository
          .getRemoteFingerprint(userEntity().id, this.selectedClient().id)
          .then(remoteFingerprint => this.fingerprintRemote(remoteFingerprint));
      }
    });

    this.clickOnDevice = (clientEntity: ClientEntity) => {
      this.selectedClient(clientEntity);
      const headline = userEntity().is_me
        ? this.selectedClient().label || this.selectedClient().model
        : capitalizeFirstChar(this.selectedClient().class);
      goTo(UserDevicesState.DEVICE_DETAILS, headline);
    };

    this.clickOnShowSelfDevices = () => amplify.publish(WebAppEvents.PREFERENCES.MANAGE_DEVICES);

    this.clickToResetSession = () => {
      const _resetProgress = () => window.setTimeout(() => this.isResettingSession(false), MotionDuration.LONG);
      this.isResettingSession(true);
      conversationRepository
        .reset_session(userEntity().id, this.selectedClient().id, this.activeConversation().id)
        .then(_resetProgress)
        .catch(_resetProgress);
    };

    this.clickToShowSelfFingerprint = () => {
      if (!this.fingerprintLocal().length) {
        this.fingerprintLocal(cryptographyRepository.getLocalFingerprint());
      }
      goTo(UserDevicesState.SELF_FINGERPRINT, t('participantDevicesSelfFingerprint'));
    };

    this.clickToToggleDeviceVerification = () => {
      const toggleVerified = !this.selectedClient().meta.isVerified();
      clientRepository
        .verifyClient(userEntity().id, this.selectedClient(), toggleVerified)
        .catch((error: Dexie.DexieError) => logger.warn(`Failed to toggle client verification: ${error.message}`));
    };

    this.dispose = () => {
      selectedClientSubscription.dispose();
    };
  },
});
