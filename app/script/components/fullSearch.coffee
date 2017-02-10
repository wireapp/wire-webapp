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

class z.components.FullSearchViewModel

  constructor: (params) ->

    @search_provider = params.search_provider

    @message_ets = ko.observableArray()

    @input = ko.observable()
    @input.subscribe _.debounce (query) =>
      if query.length < 2
        return @message_ets []

      @search_provider(query).then ([message_ets, query]) =>
        if query is @input()
          @message_ets message_ets.splice(0, 20) # pagination
    , 100

ko.components.register 'full-search',
  viewModel: z.components.FullSearchViewModel
  template: """
            <header class="full-search-header">
              <span class="full-search-header-icon icon-search"></span>
              <div class="full-search-header-input">
                <input type="text" data-bind="textInput: input"/>
              </div>
            </header>
            <div class="full-search-list" data-bind="foreach: {data: message_ets}">
              <div class="full-search-item">
                <div class="full-search-item-avatar">
                  <user-avatar class="user-avatar-xs" params="user: user()"></user-avatar>
                </div>
                <div class="full-search-item-content">
                  <div class="full-search-item-content-text" data-bind="text: get_first_asset().text"></div>
                  <div class="full-search-item-content-info">
                    <span class="font-weight-bold" data-bind="text: user().first_name()"></span>
                    <span data-bind="text: moment($data.timestamp).format('MMMM D, YYYY')"></span>
                  </div>
                </div>
              </div>
            </div>
            """
