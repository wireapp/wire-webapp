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

import {AVATAR_SIZE} from 'Components/ParticipantAvatar';
import type {User} from '../entity/User';

interface TopPeopleParams {
  click: (userEntity: User, event: Event) => void;
  max?: number;
  users: ko.ObservableArray<User>;
}

class TopPeople {
  click: (userEntity: User, event: Event) => void;
  maxUsers: number;
  userEntities: ko.Observable<User[]>;
  AVATAR_SIZE: typeof AVATAR_SIZE;
  displayedUsers: ko.PureComputed<User[]>;

  constructor(params: TopPeopleParams) {
    this.click = params.click;
    this.maxUsers = params.max || 9;
    this.AVATAR_SIZE = AVATAR_SIZE;
    this.userEntities = params.users;

    this.displayedUsers = ko.pureComputed(() => this.userEntities().slice(0, this.maxUsers));
  }

  onUserClick = (userEntity: User, event: Event): void => {
    if (typeof this.click === 'function') {
      return this.click(userEntity, event);
    }
  };
}

ko.components.register('top-people', {
  template: `
    <div class="search-list search-list-sm" data-bind="foreach: {data: displayedUsers}">
      <div class="search-list-item" data-bind="click: $parent.onUserClick, attr: {'data-uie-uid': $data.id, 'data-uie-value': $data.name(), 'data-uie-status': $data.connection().status()}" data-uie-name="item-user">
        <participant-avatar class="search-list-item-image" params="participant: $data, delay: 300, size: $parent.AVATAR_SIZE.LARGE"></participant-avatar>
        <div class="search-list-item-content">
          <div class="search-list-item-content-name" data-bind="text: name"></div>
        </div>
      </div>
    </div>
  `,
  viewModel: TopPeople,
});
