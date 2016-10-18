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

class z.components.UserListInputViewModel
  constructor: (params, component_info) ->
    @input = params.input
    @selected = params.selected or ko.observableArray []
    @placeholder = params.placeholder
    @on_enter = params.enter
    @on_close = params.close

    @element = component_info.element
    @input_element = $(@element).find '.search-input'
    @inner_element = $(@element).find '.search-inner'

    @selected_subscription = @selected.subscribe =>
      @input ''
      @input_element.focus()
      window.setTimeout =>
        @inner_element.scrollTop @inner_element[0].scrollHeight

    @placeholder = ko.pureComputed =>
      if @input() is '' and @selected().length is 0
        return z.localization.Localizer.get_text params.placeholder
      else
        return ''

  on_key_press: (data, event) =>
    @selected.pop() if event.keyCode is z.util.KEYCODE.DELETE and @input() is ''
    return true

  dispose: =>
    @selected_subscription.dispose()


ko.components.register 'user-input',
  viewModel:
    createViewModel: (params, component_info) ->
      return new z.components.UserListInputViewModel params, component_info
  template: """
            <div class="search-outer">
              <div class="search-inner-wrap">
                <div class="search-inner">
                  <!-- ko foreach: selected -->
                    <span data-bind="text: first_name()"></span>
                  <!-- /ko -->
                  <input maxlength="128" required class="search-input" type="text" data-bind="textInput: input, hasFocus: true, event: {keydown: on_key_press}, enter: on_enter, attr: {placeholder: placeholder}" data-uie-name="enter-users">
                  <div class="search-close icon-close icon-button" data-bind="click: on_close, l10n_tooltip: z.string.tooltip_search_close" data-uie-name="do-close"></div>
                </div>
              </div>
            </div>
            """
