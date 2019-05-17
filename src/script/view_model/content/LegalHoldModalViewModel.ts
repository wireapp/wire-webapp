/*
 * Wire
 * Copyright (C) 2019 Wire Swiss GmbH
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

import {UserDevicesHistory, UserDevicesState, makeUserDevicesHistory} from 'Components/userDevices';
import ko from 'knockout';
import {ClientRepository} from 'src/script/client/ClientRepository';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {CryptographyRepository} from 'src/script/cryptography/CryptographyRepository';
import {User} from 'src/script/entity/User';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {UserRepository} from 'src/script/user/UserRepository';

export class LegalHoldModalViewModel {
  userRepository: UserRepository;
  conversationRepository: ConversationRepository;
  teamRepository: TeamRepository;
  clientRepository: ClientRepository;
  cryptographyRepository: CryptographyRepository;

  isVisible: ko.Observable<boolean>;
  isOnlyMe: ko.Observable<boolean>;
  users: ko.Observable<User[]>;
  devicesUser: ko.Observable<User>;
  hide: () => void;
  onClosed: () => void;
  userDevicesHistory: UserDevicesHistory;
  showDeviceList: () => boolean;

  constructor(
    userRepository: UserRepository,
    conversationRepository: ConversationRepository,
    teamRepository: TeamRepository,
    clientRepository: ClientRepository,
    cryptographyRepository: CryptographyRepository
  ) {
    this.userRepository = userRepository;
    this.conversationRepository = conversationRepository;
    this.teamRepository = teamRepository;
    this.clientRepository = clientRepository;
    this.cryptographyRepository = cryptographyRepository;

    this.isVisible = ko.observable(false);
    this.isOnlyMe = ko.observable(false);
    this.users = ko.observable([]);
    this.devicesUser = ko.observable();
    this.userDevicesHistory = makeUserDevicesHistory();
    this.showDeviceList = () => this.userDevicesHistory.current() === UserDevicesState.DEVICE_LIST;

    this.hide = () => this.isVisible(false);
    this.onClosed = () => {
      this.users([]);
      this.devicesUser(undefined);
    };
  }

  showUsers = (users: User[]) => {
    const isOnlyMe = users.length === 1 && users[0].is_me;
    this.users(users);
    this.isOnlyMe(isOnlyMe);
    this.isVisible(true);
  };

  showUserDevices = (user: User) => {
    this.devicesUser(user);
  };

  clickOnBack() {
    if (!this.showDeviceList()) {
      return this.userDevicesHistory.goBack();
    }
    this.devicesUser(undefined);
  }
}
