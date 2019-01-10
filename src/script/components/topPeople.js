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

window.z = window.z || {};
window.z.components = z.components || {};

z.components.TopPeople = class TopPeople {
  constructor(params) {
    this.click = params.click;
    this.maxUsers = params.max || 9;
    this.userEntities = params.users;

    this.displayedUsers = ko.pureComputed(() => this.userEntities().slice(0, this.maxUsers));

    this.onUserClick = (userEntity, event) => {
      if (typeof this.click === 'function') {
        return this.click(userEntity, event);
      }
    };
  }
};

ko.components.register('top-people', {
  template: `
    <div class="search-list search-list-sm" data-bind="foreach: {data: displayedUsers}">
      <div class="search-list-item" data-bind="click: $parent.onUserClick, attr: {'data-uie-uid': $data.id, 'data-uie-value': $data.name(), 'data-uie-status': $data.connection().status()}" data-uie-name="item-user">
        <participant-avatar class="search-list-item-image" params="participant: $data, delay: 300, size: z.components.ParticipantAvatar.SIZE.LARGE"></participant-avatar>
        <div class="search-list-item-content">
          <div class="search-list-item-content-name" data-bind="text: first_name"></div>
        </div>
      </div>
    </div>
  `,
  viewModel: z.components.TopPeople,
});
