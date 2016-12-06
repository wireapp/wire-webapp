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

# remove save animation
SAVED_ANIMATION_TIMEOUT = 750 * 2

class z.ViewModel.content.PreferencesAccountViewModel
  constructor: (element_id, @client_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.content.PreferencesAccountViewModel', z.config.LOGGER.OPTIONS

    @self_user = @user_repository.self
    @new_clients = ko.observableArray()
    @name = ko.pureComputed => @self_user().name()

    @username = ko.pureComputed => @self_user().username()
    @entered_username = ko.observable()
    @submitted_username = ko.observable()
    @username_error = ko.observable()

    @name_saved = ko.observable()
    @username_saved = ko.observable()

    @_init_subscriptions()

  _init_subscriptions: =>
    amplify.subscribe z.event.WebApp.CLIENT.ADD, @on_client_add
    amplify.subscribe z.event.WebApp.CLIENT.REMOVE, @on_client_remove
    amplify.subscribe z.event.WebApp.PREFERENCES.UPLOAD_PICTURE, @set_picture

  removed_from_view: =>
    @_reset_username_input()

  change_accent_color: (id) =>
    @user_repository.change_accent_color id

  change_name: (name, e) =>
    new_name = e.target.value

    if new_name is @self_user().name()
      e.target.blur()

    @user_repository.change_name new_name
    .then =>
      @name_saved true
      e.target.blur()
      window.setTimeout =>
        @name_saved false
      , SAVED_ANIMATION_TIMEOUT

  reset_name_input: =>
    return if @name_saved()
    @name.notifySubscribers()

  reset_username_input: =>
    return if @username_saved()
    @_reset_username_input()
    @username.notifySubscribers()

  should_focus_username: =>
    return @user_repository.should_set_username

  check_username_input: (username, e) ->
    return true if e.charCode is 0 # FF sends charCode 0 when pressing backspace
    return z.user.UserHandleGenerator.validate_character String.fromCharCode(e.charCode) # automation is missing key prop

  change_username: (username, e) =>
    entered_username = e.target.value

    if entered_username.length < 2
      @username_error null
      return

    if entered_username is @self_user().username()
      e.target.blur()

    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.ENTERED_USERNAME,
      length: entered_username.length

    @submitted_username entered_username
    @user_repository.change_username entered_username
    .then =>
      if @entered_username() is @submitted_username()
        @username_error null
        @username_saved true

        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS.SET_USERNAME,
          length: entered_username.length

        e.target.blur()
        window.setTimeout =>
          @username_saved false
        , SAVED_ANIMATION_TIMEOUT
    .catch (error) =>
      if @entered_username() isnt @submitted_username()
        return
      if error.type is z.user.UserError::TYPE.USERNAME_TAKEN
        @username_error 'taken'

  verify_username: (username, e) =>
    entered_username = e.target.value

    if entered_username.length < 2 or entered_username is @self_user().username()
      @username_error null
      return

    @entered_username entered_username
    @user_repository.verify_username entered_username
    .then =>
      if @entered_username() is entered_username
        @username_error 'available'
    .catch (error) =>
      if @entered_username() isnt entered_username
        return
      if error.type is z.user.UserError::TYPE.USERNAME_TAKEN
        @username_error 'taken'

  check_new_clients: =>
    return if not @new_clients().length

    amplify.publish z.event.WebApp.SEARCH.BADGE.HIDE
    amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CONNECTED_DEVICE,
      data: @new_clients()
      close: =>
        @new_clients.removeAll()
      secondary: ->
        amplify.publish z.event.WebApp.CONTENT.SWITCH, z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES

  click_on_change_picture: (files) =>
    @set_picture files, ->
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PROFILE_PICTURE_CHANGED, source: 'fromPhotoLibrary'

  click_on_delete_account: ->
    amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.DELETE_ACCOUNT,
      action: =>
        @user_repository.delete_me()
      data: @self_user().email()

  click_on_logout: =>
    @client_repository.logout_client()

  click_on_reset_password: ->
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PASSWORD_RESET, value: 'fromProfile'
    z.util.safe_window_open z.string.url_password_reset

  set_picture: (files, callback) =>
    input_picture = files[0]
    warning_file_format = z.localization.Localizer.get_text z.string.alert_upload_file_format
    warning_file_size = z.localization.Localizer.get_text
      id: z.string.alert_upload_too_large
      replace:
        placeholder: '%no'
        content: z.config.MAXIMUM_IMAGE_FILE_SIZE / 1024 / 1024
    warning_min_size = z.localization.Localizer.get_text z.string.alert_upload_too_small

    if input_picture.size > z.config.MAXIMUM_IMAGE_FILE_SIZE
      return @_show_upload_warning warning_file_size, callback

    if not input_picture.type in z.config.SUPPORTED_IMAGE_TYPES
      return @_show_upload_warning warning_file_format, callback

    max_width = z.config.MINIMUM_PROFILE_IMAGE_SIZE.WIDTH
    max_height = z.config.MINIMUM_PROFILE_IMAGE_SIZE.HEIGHT
    z.util.valid_profile_image_size input_picture, max_width, max_height, (valid) =>
      if valid
        @user_repository.change_picture(input_picture).then callback
      else
        @_show_upload_warning warning_min_size, callback

  _show_upload_warning: (warning, callback) ->
    amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
    window.setTimeout ->
      callback? null, 'error'
      window.alert warning
    , 200

  on_client_add: (user_id, client_et) =>
    return true if user_id isnt @self_user().id
    amplify.publish z.event.WebApp.SEARCH.BADGE.SHOW
    @new_clients.push client_et

  on_client_remove: (user_id, client_id) =>
    return true if user_id isnt @self_user().id
    for client_et in @new_clients() when client_et.id is client_id
      @new_clients.remove client_et
    amplify.publish z.event.WebApp.SEARCH.BADGE.HIDE if not @new_clients().length

  _reset_username_input: =>
    @username_error null
    @entered_username null
    @submitted_username null
