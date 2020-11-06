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

import {noop} from 'Util/util';

import {Actions} from 'Components/panel/userActions';

import {Config} from '../../Config';
import type {User} from '../../entity/User';
import type {UserRepository} from '../../user/UserRepository';
import type {ActionsViewModel} from '../ActionsViewModel';
import {container} from 'tsyringe';
import {UserState} from '../../user/UserState';

export class UserModalViewModel {
  userRepository: UserRepository;
  actionsViewModel: ActionsViewModel;
  isVisible: ko.Observable<boolean>;
  user: ko.Observable<User>;
  userNotFound: ko.Observable<boolean>;
  onClosedCallback: () => void;
  onClosed: () => void;
  hide: () => void;
  brandName: string;
  isSelfVerified: ko.PureComputed<boolean>;
  isActivatedAccount: ko.PureComputed<boolean>;

  constructor(
    userRepository: UserRepository,
    actionsViewModel: ActionsViewModel,
    private readonly userState = container.resolve(UserState),
  ) {
    this.userRepository = userRepository;
    this.actionsViewModel = actionsViewModel;

    this.isActivatedAccount = this.userState.isActivatedAccount;
    this.isVisible = ko.observable(false);
    this.user = ko.observable(null);
    this.userNotFound = ko.observable(false);
    this.onClosedCallback = noop;
    this.onClosed = () => {
      this.user(null);
      this.userNotFound(false);
      this.onClosedCallback();
    };
    this.hide = () => this.isVisible(false);
    this.brandName = Config.getConfig().BRAND_NAME;
    this.isSelfVerified = ko.pureComputed(() => this.userState.self()?.is_verified());
  }

  onUserAction = (userAction: string): void => {
    switch (userAction) {
      case Actions.UNBLOCK:
      case Actions.SEND_REQUEST:
        this.actionsViewModel.open1to1Conversation(this.user());
        break;
    }
    this.hide();
  };

  showUser(userId: string, onModalClosed: () => void = noop): void {
    this.onClosedCallback = onModalClosed;
    this.user(null);
    this.userNotFound(false);
    if (userId) {
      this.userRepository
        .getUserById(userId)
        .then(user => {
          if (user.isDeleted) {
            return this.userNotFound(true);
          }
          this.user(user);
        })
        .catch(() => this.userNotFound(true));
      this.isVisible(true);
    }
  }
}
