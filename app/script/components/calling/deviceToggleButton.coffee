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

class z.components.DeviceToggleButton
  constructor: (params) ->
    @current_device_index = params.index
    @number_of_devices = params.length
    @icon_class = if params.type is z.media.MediaDeviceType.VIDEO_INPUT then 'icon-video' else 'icon-screensharing'


ko.components.register 'device-toggle-button',
  viewModel: z.components.DeviceToggleButton
  template: """
              <div class="device-toggle-button-icon" data-bind="css: icon_class"></div>
              <div class="device-toggle-button-indicator">
                <!-- ko foreach: ko.utils.range(0, number_of_devices() - 1) -->
                  <span class="device-toggle-button-indicator-dot" data-bind="css: {'device-toggle-button-indicator-dot-active': $data == $parent.current_device_index()}"></span>
                <!-- /ko -->
              </div>
            """
