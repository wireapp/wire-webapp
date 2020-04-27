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

import {makeUserDevicesHistory, UserDevicesState, UserDevicesHistory} from 'Components/userDevices';

import {BasePanelViewModel, PanelViewModelProps} from './BasePanelViewModel';
import {User} from '../../entity/User';
import {ConversationRepository} from '../../conversation/ConversationRepository';
import {ClientRepository} from '../../client/ClientRepository';
import {CryptographyRepository} from '../../cryptography/CryptographyRepository';

export class ParticipantDevicesViewModel extends BasePanelViewModel {
  clientRepository: ClientRepository;
  conversationRepository: ConversationRepository;
  cryptographyRepository: CryptographyRepository;
  userDevicesHistory: UserDevicesHistory;
  showSelfFingerprint: () => boolean;
  showDeviceDetails: () => boolean;
  showDeviceList: () => boolean;
  userEntity: ko.Observable<User>;

  constructor(params: PanelViewModelProps) {
    super(params);
    const {client, conversation, cryptography} = params.repositories;
    this.clientRepository = client;
    this.conversationRepository = conversation;
    this.cryptographyRepository = cryptography;
    this.userDevicesHistory = makeUserDevicesHistory();

    this.showSelfFingerprint = () => this.userDevicesHistory.current() === UserDevicesState.SELF_FINGERPRINT;
    this.showDeviceDetails = () => this.userDevicesHistory.current() === UserDevicesState.DEVICE_DETAILS;
    this.showDeviceList = () => this.userDevicesHistory.current() === UserDevicesState.DEVICE_LIST;

    this.userEntity = ko.observable();
  }

  getElementId(): string {
    return 'participant-devices';
  }

  clickOnBack(): void {
    if (!this.showDeviceList()) {
      return this.userDevicesHistory.goBack();
    }

    this.onGoBack();
  }

  initView({entity: userEntity}: {entity: User}): void {
    this.userEntity(userEntity);
    this.userDevicesHistory = makeUserDevicesHistory();
  }
}
