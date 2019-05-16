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

import ko from 'knockout';
import {ConversationRepository} from 'src/script/conversation/ConversationRepository';
import {User} from 'src/script/entity/User';
import {TeamRepository} from 'src/script/team/TeamRepository';
import {UserRepository} from 'src/script/user/UserRepository';

export class LegalHoldModalViewModel {
  userRepository: UserRepository;
  conversationRepository: ConversationRepository;
  teamRepository: TeamRepository;
  isVisible: ko.Observable<boolean>;
  isOnlyMe: ko.Observable<boolean>;
  users: ko.Observable<User[]>;
  devicesUserId: ko.Observable<string>;
  hide: () => void;
  onClosed: () => void;

  constructor(
    userRepository: UserRepository,
    conversationRepository: ConversationRepository,
    teamRepository: TeamRepository
  ) {
    this.userRepository = userRepository;
    this.conversationRepository = conversationRepository;
    this.teamRepository = teamRepository;

    this.isVisible = ko.observable(false);
    this.isOnlyMe = ko.observable(false);
    this.users = ko.observable([]);
    this.devicesUserId = ko.observable('');

    this.hide = () => this.isVisible(false);
    this.onClosed = () => {
      this.users([]);
    };
  }

  showUsers = (users: User[]) => {
    const isOnlyMe = users.length === 1 && users[0].is_me;
    this.users(users);
    this.isOnlyMe(isOnlyMe);
    this.isVisible(true);
  };

  showUserDevices = (user: User) => {
    // TODO: show the devices of the user
  };
}
