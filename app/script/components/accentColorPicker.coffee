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

class z.components.AccentColorPicker
  ###
  Construct a new accent color picker view model.

  @param params [Object]
  @option params [z.entity.User] user User entity
  @option params [Object] selected Selected accent color
  ###
  constructor: (params) ->

    @user = ko.unwrap params.user

    @accent_color_ids = [1..7]

    @on_select = (id) ->
      params?.selected id
      return true


# Knockout registration of the accent color picker component.
ko.components.register 'accent-color-picker',
  viewModel: z.components.AccentColorPicker
  template: """
    <!-- ko foreach : accent_color_ids -->
      <input type="radio" name="accent"
             data-bind="attr: {'id': 'accent' + $data, 'checked': $parent.user.accent_id() === $data}, click: $parent.on_select">
      <label data-bind="attr: {'for': 'accent' + $data},css: 'accent-color-' + $data"></label>
    <!-- /ko -->
  """
