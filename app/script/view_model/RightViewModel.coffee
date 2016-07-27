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


z.ViewModel.CONTENT_STATE =
  PENDING: 'pending'
  CONVERSATION: 'conversation'
  PROFILE: 'profile'
  BLANK: ''


class z.ViewModel.RightViewModel
  constructor: (element_id, @user_repository, @conversation_repository, @call_center, @search_repository, @giphy_repository, @client_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.RightViewModel', z.config.LOGGER.OPTIONS

    # state
    @state = ko.observable z.ViewModel.CONTENT_STATE.BLANK
    @multitasking =
      auto_minimize: ko.observable true
      is_minimized: ko.observable false
      reset_minimize: ko.observable false

    # nested view models
    @call_shortcuts =        new z.ViewModel.CallShortcutsViewModel @call_center
    @video_calling =         new z.ViewModel.VideoCallingViewModel 'video-calling', @call_center, @user_repository, @conversation_repository, @multitasking
    @connect_requests =      new z.ViewModel.ConnectRequestsViewModel 'connect-requests', @user_repository
    @conversation_titlebar = new z.ViewModel.ConversationTitlebarViewModel 'conversation-titlebar', @conversation_repository, @call_center, @multitasking
    @conversation_input =    new z.ViewModel.ConversationInputViewModel 'conversation-input', @conversation_repository, @user_repository
    @message_list =          new z.ViewModel.MessageListViewModel 'message-list', @conversation_repository, @user_repository
    @participants =          new z.ViewModel.ParticipantsViewModel 'participants', @user_repository, @conversation_repository, @search_repository
    @self_profile =          new z.ViewModel.SelfProfileViewModel 'self-profile', @user_repository, @client_repository
    @giphy =                 new z.ViewModel.GiphyViewModel 'giphy-modal', @conversation_repository, @giphy_repository
    @detail_view =           new z.ViewModel.ImageDetailViewViewModel 'detail-view'

    @previous_state = undefined
    @previous_conversation = undefined

    @state.subscribe (value) =>
      if value is z.ViewModel.CONTENT_STATE.CONVERSATION
        @conversation_input.added_to_view()
        @conversation_titlebar.added_to_view()
      else
        @conversation_input.removed_from_view()
        @conversation_titlebar.removed_from_view()

    @multitasking.is_minimized.subscribe (is_minimized) =>
      if is_minimized
        amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CALLING.MINIMIZED_FROM_FULLSCREEN,
        conversation_type: if @call_center.joined_call().is_group() then z.tracking.attribute.ConversationType.GROUP else z.tracking.attribute.ConversationType.ONE_TO_ONE

    @user_repository.connect_requests.subscribe (requests) =>
      if @state() is z.ViewModel.CONTENT_STATE.PENDING and requests.length is 0
        @show_conversation @conversation_repository.get_most_recent_conversation()

    @_init_subscriptions()

    ko.applyBindings @, document.getElementById element_id

  _init_subscriptions: =>
    amplify.subscribe z.event.WebApp.CONVERSATION.SHOW,     @show_conversation
    amplify.subscribe z.event.WebApp.CONVERSATION.SWITCH,   @switch_conversation
    amplify.subscribe z.event.WebApp.LIST.SCROLL,           @conversation_input.show_separator
    amplify.subscribe z.event.WebApp.PENDING.SHOW,          @show_connect_requests
    amplify.subscribe z.event.WebApp.PEOPLE.TOGGLE,         @participants.toggle_participants_bubble
    amplify.subscribe z.event.WebApp.PROFILE.SHOW,          @show_self_profile
    amplify.subscribe z.event.WebApp.PROFILE.HIDE,          @hide_self_profile
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
    return @show_connect_requests() if not conversation_et?
    conversation_et = @conversation_repository.get_conversation_by_id conversation_et if not conversation_et.id?
    return if conversation_et is @conversation_repository.active_conversation()

    show_conversation = =>
      @logger.log @logger.levels.LEVEL_1, "Switching view to conversation: #{conversation_et.id}"
      @state z.ViewModel.CONTENT_STATE.CONVERSATION
      @message_list.change_conversation conversation_et, =>
        @_shift_content '.conversation'
        @participants.change_conversation conversation_et

    @conversation_repository.active_conversation conversation_et

    if @state() is z.ViewModel.CONTENT_STATE.PROFILE
      @self_profile.hide()
      setTimeout show_conversation, 750 # wait for self profile to disappear
    else
      show_conversation()

  ###
  Opens the incoming connection requests.

  @note If there are no connection requests, it will open the self profile instead
  ###
  show_connect_requests: =>
    return @show_self_profile() if @user_repository.connect_requests().length < 1

    show_connect_request = =>
      @conversation_repository.active_conversation null
      @state z.ViewModel.CONTENT_STATE.PENDING
      @_shift_content '.connect-requests'

    @message_list.release_conversation() if @state() is z.ViewModel.CONTENT_STATE.CONVERSATION

    if @state() is z.ViewModel.CONTENT_STATE.PROFILE
      @self_profile.hide()
      setTimeout show_connect_request, 750 # wait for self profile to disappear
    else
      show_connect_request()

  ###
  Open self profile.

  @param animate [Boolean] Do background animation
  ###
  show_self_profile: (animate = true) =>
    return if @state() is z.ViewModel.CONTENT_STATE.PROFILE

    @previous_state = @state()
    @previous_conversation = @conversation_repository.active_conversation()

    @message_list.release_conversation() if @state() is z.ViewModel.CONTENT_STATE.CONVERSATION

    @conversation_repository.active_conversation null
    amplify.publish z.event.WebApp.LIST.FULLSCREEN_ANIM_DISABLED if not animate
    @state z.ViewModel.CONTENT_STATE.PROFILE
    @self_profile.show()

  ###
  Close self profile.
  ###
  hide_self_profile: =>
    if @previous_state is z.ViewModel.CONTENT_STATE.PENDING
      @show_connect_requests()
    else
      @show_conversation @previous_conversation

  ###
  Switches the conversation if the other one is shown.

  @param conversation_et [z.entity.Conversation] Conversation entity to be verified as currently active for the switch
  @param next_conversation_et [z.entity.Conversation] Conversation entity to be shown
  ###
  switch_conversation: (conversation_et, next_conversation_et) =>
    @show_conversation next_conversation_et if @conversation_repository.is_active_conversation conversation_et
