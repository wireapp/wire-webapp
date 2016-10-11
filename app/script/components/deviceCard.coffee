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

    @activated_in = ko.observable()

    @_update_activation_location '?'
    @_update_location()

    $(component_info.element).addClass 'device-card-no-hover' if @detailed or not @click
    $(component_info.element).addClass 'device-card-detailed' if @detailed

  on_click_device: =>
    @click? @device

  _update_activation_location: (location) ->
    @activated_in z.localization.Localizer.get_text
      id: z.string.preferences_devices_activated_in
      replace:
        placeholder: '%location'
        content: "<span class='label-bold-xs'>#{location}</span>"

  _update_location: =>
    return if not @device?.location

    z.location.get_location @device.location.lat, @device.location.lon
    .then (retrieved_location) =>
      @_update_activation_location "#{retrieved_location.place}, #{retrieved_location.country_code}"
    .catch (error) =>
      @logger.log @logger.levels.WARN, "Could not update device location: #{error.message}", error


ko.components.register 'device-card',
  viewModel:
    createViewModel: (params, component_info) ->
      return new z.components.DeviceCard params, component_info
  template: """
              <div class="device-info" data-bind="click: on_click_device,
                attr: {'data-uie-uid': id, 'data-uie-value': label, 'data-uie-name': data_uie_name}">
                <!-- ko if: detailed -->
                  <div class="label-xs device-label" data-bind="text: label"></div>
                  <div class="label-xs">
                    <span data-bind="l10n_text: z.string.preferences_devices_id"></span>
                    <span data-uie-name="device-id" data-bind="html: z.util.print_devices_id(id)"></span>
                  </div>
                  <div class="label-xs" data-bind="html: activated_in"></div>
                  <div class="label-xs" data-bind="text: z.util.format_timestamp(device.time)"></div>
                <!-- /ko -->
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
              </div>
            """
