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

class z.components.DeviceRemove
  constructor: (params, component_info) ->
    @device = ko.unwrap params.device
    @device_remove_error = params.error or ko.observable false
    @model = @device.model

    @remove_form_visible = ko.observable false

    @password = ko.observable ''
    @password_subscription = @password.subscribe (value) =>
      @device_remove_error false if value.length > 0

    @click_on_submit = =>
      params.remove? @password(), @device

    @click_on_cancel = =>
      @remove_form_visible false
      params.cancel?()

    @click_on_remove_device = =>
      @remove_form_visible true

  dispose: =>
    @password_subscription.dispose()


ko.components.register 'device-remove',
  viewModel: createViewModel: (params, component_info) ->
    return new z.components.DeviceRemove params, component_info
  template: """
              <!-- ko ifnot: remove_form_visible() -->
                <span class="device-remove-button text-red"
                    data-bind="attr: {'data-uie-value': model}, click: click_on_remove_device, l10n_text: z.string.preferences_devices_remove"
                    data-uie-name="go-remove-device"></span>
              <!-- /ko  -->
              <!-- ko if: remove_form_visible() -->
                <form class="device-remove-form" data-bind="submit: click_on_submit, attr: {'data-uie-value': model}" data-ui-name="device-remove-form">
                  <input  class="device-remove-input"
                          type="password"
                          data-bind="hasfocus: true, textInput: password, l10n_placeholder: z.string.auth_placeholder_password_put, css: {'device-remove-input-error': device_remove_error}"
                          data-uie-name="remove-device-password" />
                  <button class="device-remove-button-remove button button-medium button-fluid"
                          data-bind="attr: {'data-uie-value': model}, l10n_text: z.string.preferences_devices_remove"
                          data-uie-name="do-remove-device"
                          type="submit"></button>
                  <button class="device-remove-button text-graphite text-underline"
                          data-bind="click: click_on_cancel, l10n_text: z.string.preferences_devices_remove_cancel"
                          data-uie-name="remove-device-cancel"></button>
                </form>
              <!-- /ko -->
            """
