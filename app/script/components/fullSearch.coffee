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
    @on_change = params.change

    @message_ets = []
    @message_ets_rendered = ko.observableArray()
    @number_of_message_to_render = 30

    @input = ko.observable()
    @input.subscribe _.debounce (query) =>
      @on_change query

      if query.length < 2
        @message_ets = []
        @message_ets_rendered []
        return

      @search_provider(query).then ([message_ets, query]) =>
        if query is @input()
          @message_ets = message_ets
          @message_ets_rendered @message_ets.splice(0, @number_of_message_to_render)
    , 100

    @transform_text = (message_et) =>
      tokens = z.search.FullTextSearch.tokenize @input()
      text = message_et.get_first_asset().text
      return text.replace new RegExp(tokens.join '|', "gmi"), (match) -> "<mark class='full-search-marked'>#{match}</mark>"

    # binding?
    $('.collection-list').on 'scroll', (event) =>
      if $(event.currentTarget).is_scrolled_bottom() and @message_ets.length > 0
        z.util.ko_array_push_all @message_ets_rendered, @message_ets.splice(0, @number_of_message_to_render)

  dispose: ->
    $('.collection-list').off 'scroll'


ko.components.register 'full-search',
  viewModel: z.components.FullSearchViewModel
  template: """
            <header class="full-search-header">
              <span class="full-search-header-icon icon-search"></span>
              <div class="full-search-header-input">
                <input type="text" data-bind="textInput: input"/>
              </div>
            </header>
            <div class="full-search-list" data-bind="foreach: {data: message_ets_rendered}">
              <div class="full-search-item">
                <div class="full-search-item-avatar">
                  <user-avatar class="user-avatar-xs" params="user: user()"></user-avatar>
                </div>
                <div class="full-search-item-content">
                  <div class="full-search-item-content-text" data-bind="html: $parent.transform_text($data)"></div>
                  <div class="full-search-item-content-info">
                    <span class="font-weight-bold" data-bind="text: user().first_name()"></span>
                    <span data-bind="text: moment($data.timestamp).format('MMMM D, YYYY')"></span>
                  </div>
                </div>
              </div>
            </div>
            """
