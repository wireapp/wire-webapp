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
    @new_clients = ko.observableArray()

    @remove_form_visible = ko.observable false
    @remove_form_error = ko.observable false

    @selected_device = ko.observable()
    @selected_device.subscribe =>
      if @selected_device()
        @is_resetting_session false
        @remove_form_visible false
        @remove_form_error false
        @_update_fingerprints()

    @fingerprint_remote = ko.observable ''
    @fingerprint_local = ko.observable ''
    @is_resetting_session = ko.observable false

    @current_client = @client_repository.current_client
    # All clients except the current client
    @devices = ko.observableArray()
    @client_repository.clients.subscribe (client_ets) =>
      @devices (client_et for client_et in client_ets when client_et.id isnt @current_client().id)

    amplify.subscribe z.event.WebApp.CLIENT.ADD, @on_client_add
    amplify.subscribe z.event.WebApp.CLIENT.REMOVE, @on_client_remove

  on_client_add: (user_id, client_et) =>
    return true if user_id isnt @user().id
    amplify.publish z.event.WebApp.SEARCH.BADGE.SHOW
    @new_clients.push client_et

  on_client_remove: (user_id, client_id) =>
    return true if user_id isnt @user().id
    for client_et in @new_clients() when client_et.id is client_id
      @new_clients.remove client_et
    amplify.publish z.event.WebApp.SEARCH.BADGE.HIDE if not @new_clients().length

  on_show_new_clients: =>
    amplify.publish z.event.WebApp.SEARCH.BADGE.HIDE
    amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CONNECTED_DEVICE,
      data: @new_clients()
      close: =>
        @new_clients.removeAll()
      secondary: =>
        @logger.log @logger.levels.ERROR, 'Not yet implemented'

  _update_fingerprints: =>
    @cryptography_repository.get_session @self_user().id, @selected_device().id
    .then (cryptobox_session) =>
      @fingerprint_remote cryptobox_session.fingerprint_remote()
      @fingerprint_local cryptobox_session.fingerprint_local()

  click_on_device: (client_et) =>
    @selected_device client_et
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.VIEWED_DEVICE, outcome: 'success'

  click_on_device_close: =>
    @selected_device null

  click_on_verify_client: =>
    toggle_verified = !!!@selected_device().meta.is_verified()
    client_id = @selected_device().id
    user_id = @self_user().id
    changes =
      meta:
        is_verified: toggle_verified

    @client_repository.update_client_in_db user_id, client_id, changes
    .then => @selected_device().meta.is_verified toggle_verified

  click_on_reset_session: =>
    reset_progress = =>
      window.setTimeout =>
        @is_resetting_session false
      , 550

    @is_resetting_session true
    @conversation_repository.reset_session @self_user().id, @selected_device().id, @conversation_repository.self_conversation().id
    .then -> reset_progress()
    .catch -> reset_progress()

  click_on_remove_device_submit: (password) =>
    @client_repository.delete_client @selected_device().id, password
    .then =>
      @selected_device null
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.REMOVED_DEVICE, outcome: 'success'
    .catch =>
      @logger.log @logger.levels.WARN, 'Unable to remove device'
      @remove_form_error true
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.REMOVED_DEVICE, outcome: 'fail'
