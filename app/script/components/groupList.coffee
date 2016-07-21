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

class z.components.GroupListViewModel
  ###
  Construct a new group list view model.

  @param params [Object]
  @option params [ko.observableArray] groups Data source
  @option params [Function] click Function called when a list item is clicked
  ###
  constructor: (params) ->
    # parameter list
    @groups = params.groups
    @avatar = params.avatar or false
    @on_select = params.click


# Knockout registration of the group list component.
ko.components.register 'group-list',
  viewModel: z.components.GroupListViewModel
  template: """
            <div class="search-list search-list-md" data-bind="foreach: {data: groups, as: 'group'}">
              <div class="search-list-item" data-bind="click: $root.click_on_group, attr: {'data-uie-uid': group.id, 'data-uie-value': group.display_name" data-uie-name="item-group">
                <!-- ko if: $parent.avatar === true -->
                  <user-avatar class="user-avatar-sm" params="user: $data.participating_user_ets()[0]"></user-avatar>
                <!-- /ko  -->
                <!-- ko if: $parent.avatar === false -->
                   <div class="search-list-item-image" data-bind="style: {backgroundImage: group.picture_preview}"></div>
                <!-- /ko  -->
                <div class="search-list-item-header" data-bind="text: group.display_name"></div>
              </div>
            </div>
            """
