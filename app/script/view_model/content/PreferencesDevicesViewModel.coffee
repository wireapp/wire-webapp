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
z.ViewModel ?= {}
z.ViewModel.content ?= {}


class z.ViewModel.content.PreferencesDevicesViewModel
  constructor: (element_id, @preferences_device_details, @client_repository, @conversation_repository, @cryptography_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.content.PreferencesDevicesViewModel', z.config.LOGGER.OPTIONS

    @self_user = @client_repository.self_user

    @current_client = @client_repository.current_client

    @activated_in = ko.observable z.l10n.text z.string.preferences_devices_activated_in
    @activated_on = ko.observable z.l10n.text z.string.preferences_devices_activated_on
    @devices = ko.observableArray()
    @fingerprint = ko.observable ''

    @should_update_scrollbar = (ko.computed =>
      return @devices()
    ).extend notify: 'always', rateLimit: 500

    @_update_activation_location '?'

    # All clients except the current client
    @client_repository.clients.subscribe (client_ets) =>
      @devices (client_et for client_et in client_ets when client_et.id isnt @current_client().id)

  _update_activation_location: (location) ->
    @activated_in z.l10n.text z.string.preferences_devices_activated_in, "<span class='preferences-devices-activated-bold'>#{location}</span>"

  _update_activation_time: (time) ->
    @activated_on z.z.l10n.text z.string.preferences_devices_activated_on, "<span class='preferences-devices-activated-bold'>#{z.util.format_timestamp time}</span>"

  _update_device_location: (location) ->
    z.location.get_location location.lat, location.lon
    .then (retrieved_location) =>
      if retrieved_location
        @_update_activation_location "#{retrieved_location.place}, #{retrieved_location.country_code}"

  click_on_show_device: (device_et) =>
    @preferences_device_details.device device_et
    amplify.publish z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS

  click_on_remove_device: (device_et, event) =>
    amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.REMOVE_DEVICE,
      action: (password) =>
        @client_repository.delete_client device_et.id, password
      data: device_et.model
    event.stopPropagation()

  update_device_info: =>
    if @current_client() and not @fingerprint()
      @_update_activation_time @current_client().time
      @_update_device_location @current_client().location if @current_client().location
      @fingerprint @cryptography_repository.get_local_fingerprint()
