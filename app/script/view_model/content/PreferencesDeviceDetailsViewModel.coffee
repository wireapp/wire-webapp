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


class z.ViewModel.content.PreferencesDeviceDetailsViewModel
  constructor: (element_id, @client_repository, @conversation_repository, @cryptography_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.content.PreferencesDeviceDetailsViewModel', z.config.LOGGER.OPTIONS

    @self_user = @client_repository.self_user

    @device = ko.observable()
    @device.subscribe (device_et) =>
      return if not device_et

      @is_resetting_session false
      @fingerprint ''
      @_update_fingerprint()
      @_update_activation_location '?'
      @_update_activation_time device_et.time
      @_update_device_location device_et.location if device_et.location

    @is_resetting_session = ko.observable false
    @fingerprint = ko.observable ''

    @activated_in = ko.observable z.localization.Localizer.get_text z.string.preferences_devices_activated_in
    @activated_on = ko.observable z.localization.Localizer.get_text z.string.preferences_devices_activated_on

  _update_activation_location: (location) ->
    @activated_in z.localization.Localizer.get_text
      id: z.string.preferences_devices_activated_in
      replace:
        placeholder: '%location'
        content: "<span class='preferences-devices-activated-bold'>#{location}</span>"

  _update_activation_time: (time) ->
    @activated_on z.localization.Localizer.get_text
      id: z.string.preferences_devices_activated_on
      replace:
        placeholder: '%time'
        content: "<span class='preferences-devices-activated-bold'>#{z.util.format_timestamp time}</span>"

  _update_device_location: (location) ->
    z.location.get_location location.lat, location.lon
    .then (retrieved_location) =>
      @_update_activation_location "#{retrieved_location.place}, #{retrieved_location.country_code}"
    .catch (error) =>
      @logger.log @logger.levels.WARN, "Could not update device location: #{error.message}", error

  _update_fingerprint: =>
    @cryptography_repository.get_session @self_user().id, @device().id
    .then (cryptobox_session) =>
      @fingerprint cryptobox_session.fingerprint_remote()

  click_on_details_close: ->
    amplify.publish z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES
    @device null

  click_on_reset_session: =>
    reset_progress = =>
      window.setTimeout =>
        @is_resetting_session false
      , 550

    @is_resetting_session true
    @conversation_repository.reset_session @self_user().id, @device().id, @conversation_repository.self_conversation().id
    .then -> reset_progress()
    .catch -> reset_progress()

  click_on_remove_device: =>
    amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.REMOVE_DEVICE,
      action: (password) =>
        @client_repository.delete_client @device().id, password
      data: @device().model

  toggle_device_verification: =>
    toggle_verified = !!!@device().meta.is_verified()

    @client_repository.update_client_in_db @self_user().id, @device().id, {meta: is_verified: toggle_verified}
    .then => @device().meta.is_verified toggle_verified

    event.stopPropagation()
