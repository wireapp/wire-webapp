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

class z.components.InputElement
  constructor: (params, component_info) ->

    @value = params.value

    @change = (data, event) =>
      new_name = z.util.StringUtil.remove_line_breaks event.target.value.trim()
      old_name = @value().trim()
      event.target.value = old_name
      @editing false
      params.change? new_name if new_name isnt old_name

    @edit = -> @editing true

    @editing = ko.observable false
    @editing_subscription = @editing.subscribe (value) =>
      if value
        $(component_info.element).find('textarea').one 'keydown', (e) =>
          @editing false if e.keyCode is z.util.KEYCODE.ESC
      else
        $(component_info.element).find('textarea').off 'keydown', 'esc', @abort

    @placeholder = params.placeholder

  dispose: =>
    @editing_subscription.dispose()


# Knockout registration of the input element component.
ko.components.register 'input-element',
  viewModel:
    createViewModel: (params, component_info) ->
      return new z.components.InputElement params, component_info
  template: """
            <span data-bind="visible: !editing(), text: value(), click: edit" data-uie-name="status-name"></span>
            <textarea data-bind="visible: editing, value: value(), enter: change, event: {blur: change}, hasFocus: editing, resize, l10n_placeholder: placeholder" maxlength="64" data-uie-name="enter-name"></textarea>
            """
