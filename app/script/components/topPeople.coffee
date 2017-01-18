#
# Wire
# Copyright (C) 2016 Wire Swiss GmbH
#
# This program is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program. If not, see http://www.gnu.org/licenses/.
#

window.z ?= {}
z.components ?= {}

class z.components.TopPeopleViewModel
  constructor: (params) ->
    @user_ets = params.user
    @user_selected = params.selected
    @max_users = params.max or 9

    @displayed_users = ko.pureComputed =>
      return @user_ets().slice 0, @max_users

    @on_select = (user_et) =>
      if @is_selected user_et then @user_selected.remove user_et else @user_selected.push user_et

    @is_selected = (user_et) =>
      return user_et in @user_selected()


ko.components.register 'top-people',
  viewModel: z.components.TopPeopleViewModel
  template: """
            <div class="search-list search-list-sm" data-bind="foreach: {data: displayed_users}">
              <div class="search-list-item" data-bind="click: $parent.on_select, css: {'search-list-item-selected': $parent.is_selected($data)}, attr: {'data-uie-uid': $data.id, 'data-uie-value': $data.name(), 'data-uie-status': $data.connection().status()}" data-uie-name="item-user">
                <user-avatar class="search-list-item-image user-avatar-md" params="user: $data, selected: $parent.is_selected($data), delay: 300"></user-avatar>
                <div class="search-list-item-content">
                  <div class="search-list-item-content-name" data-bind="text: first_name"></div>
                </div>
              </div>
            </div>
            """
