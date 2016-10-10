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

DELETE_STATUS =
  BUTTON: 'button'
  DIALOG: 'dialog'
  SENT: 'sent'


class z.ViewModel.content.PreferencesAccountViewModel
  constructor: (element_id, @client_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.content.PreferencesAccountViewModel', z.config.LOGGER.OPTIONS

    @self_user = @user_repository.self
    @new_clients = ko.observableArray()

    @delete_status = ko.observable DELETE_STATUS.BUTTON
    @delete_confirm_text = ko.observable ''

    @_init_subscriptions()

  _init_subscriptions: =>
    amplify.subscribe z.event.WebApp.CLIENT.ADD, @on_client_add
    amplify.subscribe z.event.WebApp.CLIENT.REMOVE, @on_client_remove
    amplify.subscribe z.event.WebApp.LOGOUT.ASK_TO_CLEAR_DATA, @logout
    amplify.subscribe z.event.WebApp.PREFERENCES.UPLOAD_PICTURE, @set_picture

  change_accent_color: (id) =>
    @user_repository.change_accent_color id

  change_username: (name) =>
    @user_repository.change_username name

  click_on_change_picture: (files) =>
    @set_picture files, ->
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PROFILE_PICTURE_CHANGED, source: 'fromPhotoLibrary'

  logout: =>
    # TODO: Rely on client repository
    if @client_repository.current_client().type is z.client.ClientType.PERMANENT
      amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.LOGOUT,
        action: (clear_data) ->
          amplify.publish z.event.WebApp.SIGN_OUT, z.auth.SignOutReasion.USER_REQUESTED, clear_data
    else
      @client_repository.delete_temporary_client()
      .then -> amplify.publish z.event.WebApp.SIGN_OUT, z.auth.SignOutReasion.USER_REQUESTED, true

  set_picture: (files, callback) =>
    input_picture = files[0]
    warning_file_format = z.localization.Localizer.get_text z.string.alert_upload_file_format
    warning_file_size = z.localization.Localizer.get_text {
      id: z.string.alert_upload_too_large
      replace: {placeholder: '%no', content: z.config.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024}
    }
    warning_min_size = z.localization.Localizer.get_text z.string.alert_upload_too_small

    if input_picture.size > z.config.MAXIMUM_IMAGE_FILE_SIZE
      return @_show_upload_warning warning_file_size, callback

    if not input_picture.type in z.config.SUPPORTED_IMAGE_TYPES
      return @_show_upload_warning warning_file_format, callback

    max_width = z.config.MINIMUM_PROFILE_IMAGE_SIZE.WIDTH
    max_height = z.config.MINIMUM_PROFILE_IMAGE_SIZE.HEIGHT
    z.util.valid_profile_image_size input_picture, max_width, max_height, (valid) =>
      if valid
        @user_repository.change_picture input_picture, callback
      else
        @_show_upload_warning warning_min_size, callback

  _show_upload_warning: (warning, callback) ->
    amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
    setTimeout ->
      callback? null, 'error'
      window.alert warning
    , 200

  click_on_delete: ->
    @delete_confirm_text z.localization.Localizer.get_text
      id: z.string.preferences_account_delete_detail
      replace: {placeholder: '%email', content: @self_user().email()}

    @delete_status DELETE_STATUS.DIALOG

  click_on_delete_send: ->
    @user_repository.delete_me()
    @delete_status DELETE_STATUS.SENT
    window.setTimeout =>
      @delete_status DELETE_STATUS.BUTTON
    , 5000

  click_on_delete_cancel: ->
    @delete_status DELETE_STATUS.BUTTON

  click_on_reset_password: ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PASSWORD_RESET, value: 'fromProfile'
    z.util.safe_window_open z.string.url_password_reset

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
