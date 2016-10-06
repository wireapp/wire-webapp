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

    @accent_colors = ko.pureComputed =>
      [1..7].map (id) =>
        css_class = "accent-color-#{id}"
        if @user? and @user.accent_id() is id
          css_class += ' selected'
        color =
          css: css_class
          id: id

    @on_select = (color) ->
      params?.selected color


# Knockout registration of the accent color picker component.
ko.components.register 'accent-color-picker',
  viewModel: z.components.AccentColorPicker
  template: """
              <!-- ko foreach : accent_colors() -->
                <div class="accent-color-picker-segment" data-bind="css: $data.css, click: $parent.on_select">
                  <div class="spacer"></div>
                  <div class="spacer circle"></div>
                  <div class="spacer"></div>
                </div>
              <!-- /ko -->
            """
