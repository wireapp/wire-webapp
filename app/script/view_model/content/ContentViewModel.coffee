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


class z.ViewModel.content.ContentViewModel
  constructor: (element_id, @audio_repository, @call_center, @client_repository, @conversation_repository, @cryptography_repository, @giphy_repository, @media_repository, @search_repository, @user_repository, @properties_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.ContentViewModel', z.config.LOGGER.OPTIONS

    # state
    @content_state = ko.observable z.ViewModel.content.CONTENT_STATE.WATERMARK
    @multitasking =
      auto_minimize: ko.observable true
      is_minimized: ko.observable false
      reset_minimize: ko.observable false

    # nested view models
    @call_shortcuts =             new z.ViewModel.CallShortcutsViewModel @call_center
    @video_calling =              new z.ViewModel.VideoCallingViewModel 'video-calling', @call_center, @conversation_repository, @media_repository, @user_repository, @multitasking
    @connect_requests =           new z.ViewModel.content.ConnectRequestsViewModel 'connect-requests', @user_repository
    @conversation_titlebar =      new z.ViewModel.ConversationTitlebarViewModel 'conversation-titlebar', @call_center, @conversation_repository, @multitasking
    @conversation_input =         new z.ViewModel.ConversationInputViewModel 'conversation-input', @conversation_repository, @user_repository
    @message_list =               new z.ViewModel.MessageListViewModel 'message-list', @conversation_repository, @user_repository
    @participants =               new z.ViewModel.ParticipantsViewModel 'participants', @user_repository, @conversation_repository, @search_repository
    @giphy =                      new z.ViewModel.GiphyViewModel 'giphy-modal', @conversation_repository, @giphy_repository
    @detail_view =                new z.ViewModel.ImageDetailViewViewModel 'detail-view'

    @preferences_account =        new z.ViewModel.content.PreferencesAccountViewModel 'preferences-account', @client_repository, @user_repository
    @preferences_av =             new z.ViewModel.content.PreferencesAVViewModel 'preferences-av', @audio_repository, @media_repository
    @preferences_device_details = new z.ViewModel.content.PreferencesDeviceDetailsViewModel 'preferences-devices', @client_repository, @conversation_repository, @cryptography_repository
    @preferences_devices =        new z.ViewModel.content.PreferencesDevicesViewModel 'preferences-devices', @preferences_device_details, @client_repository, @conversation_repository, @cryptography_repository
    @preferences_options =        new z.ViewModel.content.PreferencesOptionsViewModel 'preferences-options', @properties_repository

    @previous_state = undefined
    @previous_conversation = undefined

    @content_state.subscribe (content_state) =>
      switch content_state
        when z.ViewModel.content.CONTENT_STATE.CONVERSATION
          @conversation_input.added_to_view()
          @conversation_titlebar.added_to_view()
        when z.ViewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT
          @preferences_account.check_new_clients()
          @preferences_devices.update_fingerprint()
        when z.ViewModel.content.CONTENT_STATE.PREFERENCES_AV
          @preferences_av.initiate_devices()
        when z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES
          @preferences_devices.update_fingerprint()
        else
          @conversation_input.removed_from_view()
          @conversation_titlebar.removed_from_view()

    @multitasking.is_minimized.subscribe (is_minimized) =>
      if is_minimized and @call_center.joined_call()
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CALLING.MINIMIZED_FROM_FULLSCREEN,
        conversation_type: if @call_center.joined_call().is_group() then z.tracking.attribute.ConversationType.GROUP else z.tracking.attribute.ConversationType.ONE_TO_ONE

    @user_repository.connect_requests.subscribe (requests) =>
      if @content_state() is z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS and requests.length is 0
        @show_conversation @conversation_repository.get_most_recent_conversation()

    @_init_subscriptions()

    ko.applyBindings @, document.getElementById element_id

  _init_subscriptions: =>
    amplify.subscribe z.event.WebApp.CONTENT.SWITCH,        @switch_content
    amplify.subscribe z.event.WebApp.CONVERSATION.SHOW,     @show_conversation
    amplify.subscribe z.event.WebApp.CONVERSATION.SWITCH,   @switch_conversation
    amplify.subscribe z.event.WebApp.LIST.SCROLL,           @conversation_input.show_separator
    amplify.subscribe z.event.WebApp.PEOPLE.TOGGLE,         @participants.toggle_participants_bubble
    amplify.subscribe z.event.WebApp.WINDOW.RESIZE.HEIGHT,  @message_list.scroll_height

  ###
  Slide in specified content.
  @param content_selector [String] dom element to apply slide in animation
  ###
  _shift_content: (content_selector) ->
    incoming_css_class = 'content-animation-incoming'

    $(content_selector)
      .removeClass incoming_css_class
      .off z.util.alias.animationend
      .addClass incoming_css_class
      .one z.util.alias.animationend, ->
        $(@).removeClass(incoming_css_class).off z.util.alias.animationend

  ###
  Opens the specified conversation.

  @note If the conversation_et is not defined, it will open the incoming connection requests instead
    Conversation_et can also just be the conversation ID

  @param conversation_et [z.entity.Conversation | String] Conversation entity or conversation ID
  ###
  show_conversation: (conversation_et) =>
    return @switch_content z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS if not conversation_et

    conversation_et = @conversation_repository.get_conversation_by_id conversation_et if not conversation_et.id
    return if conversation_et is @conversation_repository.active_conversation()

    @_release_content()
    @content_state z.ViewModel.content.CONTENT_STATE.CONVERSATION
    @conversation_repository.active_conversation conversation_et
    @message_list.change_conversation conversation_et, =>
      @_show_content z.ViewModel.content.CONTENT_STATE.CONVERSATION
      @participants.change_conversation conversation_et
      @previous_conversation = @conversation_repository.active_conversation()

  switch_content: (new_content_state) =>
    return false if @content_state() is new_content_state

    @_release_content()
    @_show_content @_check_content_availability new_content_state

  ###
  Switches the conversation if the other one is shown.
  @param conversation_et [z.entity.Conversation] Conversation entity to be verified as currently active for the switch
  @param next_conversation_et [z.entity.Conversation] Conversation entity to be shown
  ###
  switch_conversation: (conversation_et, next_conversation_et) =>
    @show_conversation next_conversation_et if @conversation_repository.is_active_conversation conversation_et

  switch_previous_content: =>
    return if @previous_state is @content_state()

    if @previous_state is z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS
      @switch_content z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS
    else if @previous_conversation?.is_archived() is false
      @show_conversation @previous_conversation
    else
      @switch_content z.ViewModel.content.CONTENT_STATE.WATERMARK

  _check_content_availability: (content_state) ->
    if content_state is z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS
      return z.ViewModel.content.CONTENT_STATE.WATERMARK if not @user_repository.connect_requests().length
    return content_state

  _get_element_of_content: (content_state) ->
    switch content_state
      when z.ViewModel.content.CONTENT_STATE.CONVERSATION then '.conversation'
      when z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS then '.connect-requests'
      when z.ViewModel.content.CONTENT_STATE.PREFERENCES_ABOUT then '.preferences-about'
      when z.ViewModel.content.CONTENT_STATE.PREFERENCES_ACCOUNT then '.preferences-account'
      when z.ViewModel.content.CONTENT_STATE.PREFERENCES_AV then '.preferences-av'
      when z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICE_DETAILS then '.preferences-device-details'
      when z.ViewModel.content.CONTENT_STATE.PREFERENCES_DEVICES then '.preferences-devices'
      when z.ViewModel.content.CONTENT_STATE.PREFERENCES_OPTIONS then '.preferences-options'
      else '.watermark'

  _release_content: ->
    @previous_state = @content_state()

    if @previous_state is z.ViewModel.content.CONTENT_STATE.CONVERSATION
      @conversation_repository.active_conversation null
      @message_list.release_conversation()
    else if @previous_state is z.ViewModel.content.CONTENT_STATE.PREFERENCES_AV
      @preferences_av.release_devices()

  _show_content: (new_content_state) ->
    @content_state new_content_state
    @_shift_content @_get_element_of_content new_content_state
