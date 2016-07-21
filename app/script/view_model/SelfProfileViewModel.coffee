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

class z.ViewModel.SelfProfileViewModel
  constructor: (@element_id, @user_repository, @client_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.SelfProfileViewModel', z.config.LOGGER.OPTIONS

    @user = @user_repository.self
    @settings_bubble = new zeta.webapp.module.Bubble host_selector: '#show-settings'

    @new_clients = ko.observableArray()

    $('.self-profile').on z.util.alias.animationend, ->
      profile = $(@)
      profile.removeClass 'self-profile-transition-in self-profile-transition-out'
      profile.hide() if profile.hasClass 'self-profile-hidden'

    amplify.subscribe z.event.WebApp.LOGOUT.ASK_TO_CLEAR_DATA, @logout
    amplify.subscribe z.event.WebApp.PROFILE.UPLOAD_PICTURE, @set_picture
    amplify.subscribe z.event.WebApp.SELF.CLIENT_ADD, @on_client_add

###############################################################################
# Self Profile
###############################################################################

  change_accent_color: (color) =>
    @user_repository.change_accent_color color.id

  change_username: (name) =>
    @user_repository.change_username name

  hide: ->
    $('.self-profile')
    .addClass 'self-profile-hidden self-profile-transition-out'
    .removeClass 'self-profile-visible'

  show: ->
    $('.self-profile').show()

    window.setTimeout ->
      $('.self-profile')
      .addClass 'self-profile-visible self-profile-transition-in'
      .removeClass 'self-profile-hidden'
    , 17

    if @new_clients().length
      setTimeout @on_show_new_clients, 1000

  toggle_settings_menu: ->
    @settings_bubble.toggle()

###############################################################################
# Settings menu
###############################################################################

  logout: =>
    # TODO: Rely on client repository
    if @client_repository.current_client().type is z.client.ClientType.PERMANENT
      amplify.publish z.event.WebApp.WARNINGS.MODAL, z.ViewModel.ModalType.LOGOUT,
        action: (clear_data) ->
          amplify.publish z.event.WebApp.SIGN_OUT, 'user_requested', clear_data
    else
      @client_repository.delete_temporary_client()
      .then -> amplify.publish z.event.WebApp.SIGN_OUT, 'user_requested', true

  show_support_page: ->
    (window.open z.string.url_support)?.focus()
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS_MENU.SHOW_SUPPORT_PAGE

  toggle_about: ->
    @about_modal ?= new zeta.webapp.module.Modal '#self-about'
    @about_modal.toggle()
    if @about_modal.is_shown()
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.SETTINGS_MENU.SHOW_ABOUT_SCREEN
    @settings_bubble.hide()

  toggle_settings: ->
    @settings_bubble.hide()
    amplify.publish z.event.WebApp.PROFILE.SETTINGS.SHOW

###############################################################################
# Profile Picture
###############################################################################

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

  click_on_change_picture: (files) =>
    @set_picture files, ->
      amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.PROFILE_PICTURE_CHANGED, source: 'fromPhotoLibrary'

  _show_upload_warning: (warning, callback) ->
    amplify.publish z.event.WebApp.AUDIO.PLAY, z.audio.AudioType.ALERT
    setTimeout ->
      callback? null, 'error'
      window.alert warning
    , 200

###############################################################################
# Clients
###############################################################################

  # TODO handle clients
  on_client_add: (client) =>
    amplify.publish z.event.WebApp.SEARCH.BADGE.SHOW
    @new_clients.push client

  on_show_new_clients: =>
    amplify.publish z.event.WebApp.SEARCH.BADGE.HIDE
    amplify.publish z.event.WebApp.WARNINGS.MODAL, z.ViewModel.ModalType.CONNECTED_DEVICE,
      data: @new_clients()
      close: =>
        @new_clients.removeAll()
      secondary: =>
        setTimeout =>
          @toggle_settings()
        , 1000
