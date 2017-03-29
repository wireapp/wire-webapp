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
    @on_result = params.result
    @on_message_click = params.message_click

    @message_ets = []
    @message_ets_rendered = ko.observableArray()
    @number_of_message_to_render = 30

    @show_no_results_text = ko.observable false

    @input = ko.observable()
    @input.subscribe _.debounce (query) =>
      query = query.trim()

      @on_change query

      if query.length < 2
        @message_ets = []
        @message_ets_rendered []
        @show_no_results_text false
        return

      @search_provider(query).then ([message_ets, query]) =>
        return if query isnt @input().trim()
        @on_result() if message_ets.length > 0
        @show_no_results_text message_ets.length is 0
        @message_ets = message_ets
        @message_ets_rendered @message_ets.splice(0, @number_of_message_to_render)
    , 100

    @transform_text = (message_et) =>
      MAX_TEXT_LENGTH = 60
      MAX_OFFSET_INDEX = 30
      PRE_MARKED_OFFSET = 20

      text = _.escape message_et.get_first_asset().text
      input = _.escape @input()

      message_et.matches_count = 0
      transformed_text = text.replace z.search.FullTextSearch.get_search_regex(input), (match) ->
        message_et.matches_count += 1
        return "<mark class='full-search-marked' data-uie-name='full-search-item-mark'>#{match}</mark>"

      mark_offset = transformed_text.indexOf('<mark')
      slice_offset = mark_offset

      for index in [0...mark_offset].reverse()
        if index < mark_offset - PRE_MARKED_OFFSET
          break

        char = transformed_text[index]

        if char is ' '
          slice_offset = index + 1

      if mark_offset > MAX_OFFSET_INDEX and text.length > MAX_TEXT_LENGTH
        transformed_text = "…#{transformed_text.slice(slice_offset)}"

      return transformed_text

    # binding?
    $('.collection-list').on 'scroll', (event) =>
      if $(event.currentTarget).is_scrolled_bottom() and @message_ets.length > 0
        z.util.ko_array_push_all @message_ets_rendered, @message_ets.splice(0, @number_of_message_to_render)

  on_dismiss_button_click: =>
    @input ''

  dispose: ->
    $('.collection-list').off 'scroll'


ko.components.register 'full-search',
  viewModel: z.components.FullSearchViewModel
  template: """
            <header class="full-search-header">
              <span class="full-search-header-icon icon-search"></span>
              <div class="full-search-header-input">
                <input type="text" data-bind="hasFocus: true, l10n_placeholder: z.string.fullsearch_placeholder, textInput: input" data-uie-name="full-search-header-input"/>
                <span class="button-icon icon-dismiss" data-uie-name="full-search-dismiss" data-bind="click: on_dismiss_button_click, visible: input()"></span>
              </div>
            </header>
            <!-- ko if: show_no_results_text() -->
              <div class="full-search-no-result" data-uie-name="full-search-no-results" data-bind="l10n_text: z.string.fullsearch_no_results"></div>
            <!-- /ko -->
            <div class="full-search-list" data-uie-name="full-search-list" data-bind="foreach: {data: message_ets_rendered}">
              <div class="full-search-item" data-uie-name="full-search-item" data-bind="click: $parent.on_message_click">
                <div class="full-search-item-avatar">
                  <user-avatar class="user-avatar-xs" params="user: user()"></user-avatar>
                </div>
                <div class="full-search-item-content">
                  <div class="full-search-item-content-text ellipsis" data-uie-name="full-search-item-text" data-bind="html: $parent.transform_text($data)"></div>
                  <div class="full-search-item-content-info">
                    <span class="font-weight-bold" data-uie-name="full-search-item-sender" data-bind="text: user().first_name()"></span>
                    <span data-uie-name="full-search-item-timestamp" data-bind="text: moment($data.timestamp()).format('MMMM D, YYYY')"></span>
                  </div>
                </div>
                <div class="badge" data-uie-name="full-search-item-badge" data-bind="text: matches_count, visible: matches_count > 1"></div>
              </div>
            </div>
            """
