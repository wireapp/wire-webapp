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

class z.components.DeviceCard
  constructor: (params, component_info) ->
    @device = ko.unwrap params.device
    @id = @device?.id or ''
    @label = @device?.label or '?'
    @model = @device?.model or @device?.class or '?' # devices for other users will only provide the device class
    @class = @device?.class or '?'

    @current = params.current or false
    @detailed = params.detailed or false
    @click = params.click

    @data_uie_name = 'device-card-info'
    @data_uie_name += '-current' if @current

    @location = ko.pureComputed =>
      result = ko.observable '?'
      z.location.get_location @device.location?.lat, @device.location?.lon, (error, location) ->
        result "#{location.place}, #{location.country_code}" if location
      return result

    $(component_info.element).addClass 'device-card-no-hover' if @detailed or not @click
    $(component_info.element).addClass 'device-card-detailed' if @detailed

  on_click_device: =>
    @click? @device

  print_time: (timestamp) ->
    reg_moment = moment(timestamp)
    reg_format = if moment().year() is reg_moment.year() then 'ddd D MMM, HH:mm' else 'ddd D MMM YYYY, HH:mm'
    return reg_moment.format reg_format


ko.components.register 'device-card',
  viewModel:
    createViewModel: (params, component_info) ->
      return new z.components.DeviceCard params, component_info
  template: """
              <div class="device-info" data-bind="click: on_click_device,
                attr: {'data-uie-uid': id, 'data-uie-value': label, 'data-uie-name': data_uie_name}">
                <!-- ko ifnot: detailed -->
                  <div class="label-xs">
                    <span class="device-model" data-bind="text: model"></span>
                    <span class="text-graphite-dark" data-bind="visible: current, l10n_text: z.string.auth_limit_devices_current"></span>
                  </div>
                  <div class="text-graphite-dark label-xs">
                    <span data-bind="l10n_text: z.string.settings_devices_id"></span>
                    <span data-uie-name="device-id" data-bind="html: z.util.print_devices_id(id)"></span>
                  </div>
                <!-- /ko -->
                <!-- ko if: detailed -->
                  <div class="label-xs device-label" data-bind="text: label"></div>
                  <div class="label-xs">
                    <span data-bind="l10n_text: z.string.settings_devices_id"></span>
                    <span data-uie-name="device-id" data-bind="html: z.util.print_devices_id(id)"></span>
                  </div>
                  <div class="label-xs">
                    <span data-bind="l10n_text: z.string.settings_devices_activated"></span>
                    <span class="label-bold-xs" data-bind="text: location()"></span>
                  </div>
                  <div class="label-xs" data-bind="text: print_time(device.time)"></div>
                <!-- /ko -->
              </div>
            """
