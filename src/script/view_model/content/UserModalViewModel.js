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

import {noop} from 'Util/util';

import {Config} from '../../Config';
import {Actions} from 'Components/panel/userActions';

export class UserModalViewModel {
  constructor(userRepository, actionsViewModel) {
    this.userRepository = userRepository;
    this.actionsViewModel = actionsViewModel;

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
    this.brandName = Config.BRAND_NAME;
  }

  onUserAction = userAction => {
    switch (userAction) {
      case Actions.UNBLOCK:
      case Actions.SEND_REQUEST:
        this.actionsViewModel.open1to1Conversation(this.user());
        break;
    }
    this.hide();
  };

  showUser(userId, onModalClosed = noop) {
    this.onClosedCallback = onModalClosed;
    this.user(null);
    this.userNotFound(false);
    if (userId) {
      this.userRepository
        .get_user_by_id(userId)
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
