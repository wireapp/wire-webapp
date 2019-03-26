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

import '../../components/panel/userActions';

export class UserModalViewModel {
  constructor(userRepository, actionsViewModel) {
    this.userRepository = userRepository;
    this.actionsViewModel = actionsViewModel;

    this.isVisible = ko.observable(false);
    this.user = ko.observable(null);
    this.onClosed = () => this.user(null);
    this.hide = () => this.isVisible(false);
    this.onUserAction = () => this.hide();
  }

  showUser(userId) {
    if (userId) {
      this.userRepository.get_user_by_id(userId).then(user => {
        this.user(user);
      });
      this.isVisible(true);
    }
  }
}
