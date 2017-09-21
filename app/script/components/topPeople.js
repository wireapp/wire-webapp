/*
 * Wire
 * Copyright (C) 2017 Wire Swiss GmbH
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
window.z.components = z.components || {};

z.components.TopPeopleViewModel = class TopPeopleViewModel {
  constructor(params) {
    this.user_ets = params.user;
    this.user_selected = params.selected;
    this.max_users = params.max || 9;

    this.displayed_users = ko.pureComputed(() => {
      return this.user_ets().slice(0, this.max_users);
    });

    this.on_select = user_et => {
      if (this.is_selected(user_et)) {
        return this.user_selected.remove(user_et);
      }

      return this.user_selected.push(user_et);
    };

    this.is_selected = user_et => {
      return this.user_selected().includes(user_et);
    };
  }
};

ko.components.register('top-people', {
  template: `
    <div class="search-list search-list-sm" data-bind="foreach: {data: displayed_users}">
      <div class="search-list-item" data-bind="click: $parent.on_select, css: {'search-list-item-selected': $parent.is_selected($data)}, attr: {'data-uie-uid': $data.id, 'data-uie-value': $data.name(), 'data-uie-status': $data.connection().status()}" data-uie-name="item-user">
        <user-avatar class="search-list-item-image user-avatar-md" params="user: $data, selected: $parent.is_selected($data), delay: 300"></user-avatar>
        <div class="search-list-item-content">
          <div class="search-list-item-content-name" data-bind="text: first_name"></div>
        </div>
      </div>
    </div>
  `,
  viewModel: z.components.TopPeopleViewModel,
});
