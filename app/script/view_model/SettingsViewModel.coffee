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

SETTING =
  ALL: '0'
  NONE: '2'
  SOME: '1'

LOCALYTICS_SOUND_SETTING =
  ALL: 'alwaysPlay'
  SOME: 'FirstMessageOnly'
  NONE: 'neverPlay'

class z.ViewModel.SettingsViewModel
  constructor: (@element_id, @user_repository, @conversation_repository, @client_repository, @cryptography_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.SelfProfileViewModel', z.config.LOGGER.OPTIONS

    @user = @user_repository.self

    @settings_modal = undefined

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
      client_ets = client_ets.filter (client_et) =>
        return client_et.meta.user_id is @user().id and client_et.id isnt @current_client()?.id
      @devices client_ets

    @data_setting = ko.observable()
    @data_setting.subscribe (setting) => @user_repository.save_property_data_settings setting

    @delete_status = ko.observable 'button'
    @delete_confirm_text = ko.observable ''

    @sound_setting = ko.observable()
    @sound_setting.subscribe (setting) =>
      audio_setting = z.audio.AudioSetting.ALL
      tracking_value = LOCALYTICS_SOUND_SETTING.ALL

      if setting is SETTING.SOME
        audio_setting = z.audio.AudioSetting.SOME
        tracking_value = LOCALYTICS_SOUND_SETTING.SOME
      else if setting is SETTING.NONE
        audio_setting = z.audio.AudioSetting.NONE
        tracking_value = LOCALYTICS_SOUND_SETTING.NONE

      @user_repository.save_property_sound_alerts audio_setting
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SOUND_SETTINGS_CHANGED, value: tracking_value

    amplify.subscribe z.event.WebApp.PROPERTIES.UPDATED, @update_properties
    amplify.subscribe z.event.WebApp.PROFILE.SETTINGS.SHOW, @toggle_settings

    ko.applyBindings @, document.getElementById @element_id


  ###############################################################################
  # Settings menu
  ###############################################################################

  toggle_settings: =>
    @settings_modal ?= new zeta.webapp.module.Modal '#self-settings', => @selected_device null
    if @settings_modal.is_hidden()
      @client_repository.get_clients_for_self()
    @settings_modal.toggle()


  ###############################################################################
  # Settings
  ###############################################################################

  _update_fingerprints: =>
    @cryptography_repository.get_session @user().id, @selected_device().id
    .then (cryptobox_session) =>
      @fingerprint_remote cryptobox_session.fingerprint_remote()
      @fingerprint_local cryptobox_session.fingerprint_local()

  click_on_delete: ->
    @delete_confirm_text z.localization.Localizer.get_text
      id: z.string.preferences_delete_info
      replace: {placeholder: '%email', content: @user().email()}

    @delete_status 'dialog'

  click_on_delete_send: ->
    @user_repository.delete_me()
    @delete_status 'sent'
    setTimeout =>
      @delete_status 'button'
    , 5000

  click_on_delete_cancel: ->
    @delete_status 'button'

  click_on_reset_password: ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PASSWORD_RESET, value: 'fromProfile'
    (window.open z.string.url_password_reset)?.focus()

  click_on_device: (client_et) =>
    @selected_device client_et
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.VIEWED_DEVICE, outcome: 'success'

  click_on_device_close: =>
    @selected_device null

  click_on_verify_client: =>
    toggle_verified = !!!@selected_device().meta.is_verified()
    client_id = @selected_device().id
    user_id = @user().id
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
    @conversation_repository.reset_session @user().id, @selected_device().id, @conversation_repository.self_conversation().id
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

  update_properties: (properties) =>
    if properties.settings.sound.alerts is z.audio.AudioSetting.ALL
      @sound_setting SETTING.ALL
    else if properties.settings.sound.alerts is z.audio.AudioSetting.SOME
      @sound_setting SETTING.SOME
    else if properties.settings.sound.alerts is z.audio.AudioSetting.NONE
      @sound_setting SETTING.NONE

    @data_setting properties.settings.privacy.report_errors


  ###############################################################################
  # Google/Contacts upload
  ###############################################################################

  connect_google: ->
    amplify.publish z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.GMAIL, z.connect.ConnectTrigger.SETTINGS
    amplify.publish z.event.WebApp.SEARCH.SHOW
    @settings_modal.hide()

  connect_osx_contacts: ->
    amplify.publish z.event.WebApp.CONNECT.IMPORT_CONTACTS, z.connect.ConnectSource.ICLOUD, z.connect.ConnectTrigger.SETTINGS
    amplify.publish z.event.WebApp.SEARCH.SHOW
    @settings_modal.hide()
