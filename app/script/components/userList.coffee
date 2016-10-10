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

z.components.UserListMode =
  DEFAULT: 'default'
  COMPACT: 'compact'
  INFO: 'info'

# displays a list of user_ets
#
# @param [Object] params to adjust user list
# @option params [ko.observableArray] user data source
# @option params [ko.observable] filter filter list items
# @option params [function] click is called when a list item is selected
# @option params [function] connect is called when the connect button is clicked
# @option params [function] dismiss is called when the dismiss button is clicked
# @option params [ko.observable] selected will be populated will all the selected items
# @option params [function] selected_filter that determines if the user can be selected
#
class z.components.UserListViewModel
  constructor: (params) ->
    # parameter list
    @user_ets = params.user
    @user_click = params.click
    @user_connect = params.connect
    @user_dismiss = params.dismiss
    @user_filter = params.filter
    @user_selected = params.selected
    @user_selected_filter = params.selectable
    @mode = params.mode or z.components.UserListMode.DEFAULT

    @css_classes = ko.pureComputed =>
      if @mode is z.components.UserListMode.COMPACT
        return 'search-list-sm'
      else if @mode is z.components.UserListMode.INFO
        return 'search-list-lg'
      else
        return 'search-list-md'

    @show_buttons = =>
      return @user_connect?

    # defaults
    @filtered_user_ets = @user_ets
    @is_selected = -> return false
    @is_selectable = -> return true
    @on_select = (user_et, e) => @user_click? user_et, e
    @on_dismiss = (user_et, e) =>
      e.stopPropagation()
      @user_dismiss? user_et, e
    @on_connect = (user_et, e) =>
      e.stopPropagation()
      @user_connect? user_et, e

    # filter all list items if a filter is provided
    if @user_filter?
      @filtered_user_ets = ko.pureComputed =>
        ko.utils.arrayFilter @user_ets(), (user_et) =>
          user_name = window.getSlug user_et.name()
          search_query = window.getSlug @user_filter()
          matches_name = z.util.contains user_name, search_query
          matches_email = user_et.email() is @user_filter()
          return matches_name or matches_email

    # check every list item before selection if selected_filter is provided
    if @user_selected_filter?
      @is_selectable = @user_selected_filter

    # list will be selectable if select is provided
    if @user_selected?
      @on_select = (user_et) =>
        is_selected = @is_selected user_et
        if is_selected
          @user_selected.remove user_et
        else
          @user_selected.push user_et if @is_selectable user_et

        @user_click? user_et, not is_selected

      @is_selected = (user_et) =>
        return user_et in @user_selected()


ko.components.register 'user-list',
  viewModel: z.components.UserListViewModel
  template: """
            <div class="search-list" data-bind="css: css_classes(), foreach: {data: filtered_user_ets}">
              <div class="search-list-item" data-bind="click: $parent.on_select, css: {'search-list-item-selected': $parent.is_selected($data)}, attr: {'data-uie-uid': $data.id, 'data-uie-value': $data.name(), 'data-uie-status': $data.connection().status()}" data-uie-name="item-user">
                <!-- ko if: $parent.mode === z.components.UserListMode.COMPACT -->
                  <user-avatar class="search-list-item-image user-avatar-md" params="user: $data, selected: $parent.is_selected($data)"></user-avatar>
                  <div class="search-list-item-content">
                    <div class="search-list-item-content-name" data-bind="text: first_name"></div>
                  </div>
                <!-- /ko -->
                <!-- ko ifnot: $parent.mode === z.components.UserListMode.COMPACT -->
                  <div class="search-list-item-image">
                    <user-avatar class="user-avatar-sm" params="user: $data, selected: $parent.is_selected($data)"></user-avatar>
                    <div class="search-list-item-image-overlay">
                      <div class="background"></div>
                      <div class="checkmark icon-check"></div>
                    </div>
                  </div>
                  <div class="search-list-item-content">
                    <div class="search-list-item-content-name" data-bind="text: name"></div>
                    <!-- ko if: $parent.mode === z.components.UserListMode.INFO && $data.relation_info -->
                      <div class="search-list-item-content-info" data-bind="text: $data.relation_info"></div>
                    <!-- /ko -->
                  </div>
                  <div class="search-list-item-connect" data-bind="visible: $parent.show_buttons()">
                    <span class="icon-dismiss icon-button" data-bind="click: $parent.on_dismiss"></span>
                    <span class="icon-add icon-button" data-bind="click: $parent.on_connect"></span>
                  </div>
                <!-- /ko -->
              </div>
            </div>
            <!-- ko if: user_filter != null -->
              <!-- ko if: user_ets().length === 0 -->
                <div class="no-results" data-bind="l10n_text: z.string.people_everyone_participates"></div>
              <!-- /ko -->
              <!-- ko if: user_ets().length > 0 && filtered_user_ets().length === 0 -->
                <div class="no-results" data-bind="l10n_text: z.string.people_no_matches"></div>
              <!-- /ko -->
            <!-- /ko -->
            """
