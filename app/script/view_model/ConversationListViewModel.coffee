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

class z.ViewModel.ConversationListViewModel
  ###
  @param element_id [String] HTML selector
  @param content [z.ViewModel.RightViewModel] View model
  @param call_center [z.calling.CallCenter] Call center
  @param user_repository [z.user.UserRepository] User repository
  @param conversation_repository [z.conversation.ConversationRepository] Conversation repository
  ###
  constructor: (element_id, @content, @call_center, @user_repository, @conversation_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.ConversationListViewModel', z.config.LOGGER.OPTIONS

    @selected_list_item = @content.state
    @selected_conversation = ko.observable()
    @status =
      call: ko.computed =>
        call_et = @call_center.joined_call()
        call_status = 'none'

        if call_et?.self_user_joined()
          call_status = 'participating-in-group-call'
        else
          call_status = 'not-participating-in-group-call'

        return call_status

    @user = @user_repository.self
    @show_badge = ko.observable false

    @connect_requests = @user_repository.connect_requests
    @connect_requests_text = ko.computed =>
      count = @connect_requests().length
      if count > 1
        return z.localization.Localizer.get_text {
          id: z.string.conversation_list_many_connection_request
          replace: {placeholder: '%no', content: count}
        }
      else
        return z.localization.Localizer.get_text z.string.conversation_list_one_connection_request

    @is_conversation_list_visible = ko.observable true
    @is_self_profile_visible = ko.observable false

    @conversations_calls = @conversation_repository.conversations_call
    @conversations_archived = @conversation_repository.conversations_archived
    @conversations_unarchived = @conversation_repository.conversations_unarchived

    @joined_call = @call_center.joined_call

    @webapp_is_loaded = ko.observable false

    @should_update_scrollbar = (ko.computed =>
      return @webapp_is_loaded() or
          @is_conversation_list_visible() or
          @conversations_unarchived().length or
          @connect_requests().length or
          @conversations_calls().length
    ).extend notify: 'always', rateLimit: 500

    @active_conversation_id = ko.computed =>
      if @conversation_repository.active_conversation()?
        @conversation_repository.active_conversation().id

    @archive_tooltip = ko.computed =>
      return z.localization.Localizer.get_text {
        id: z.string.tooltip_conversation_list_archived
        replace: {placeholder: '%no', content: @conversations_archived().length}
      }

    @start_tooltip = z.localization.Localizer.get_text {
      id: z.string.tooltip_conversation_list_tooltip_start
      replace: {placeholder: '%shortcut', content: z.ui.Shortcut.get_shortcut_tooltip z.ui.ShortcutType.START}
    }

    @self_stream_state = @call_center.media_stream_handler.self_stream_state

    @show_toggle_screen = ko.pureComputed ->
      return z.calling.CallCenter.supports_screen_sharing()
    @disable_toggle_screen = ko.pureComputed =>
      return @joined_call()?.is_remote_screen_shared()

    @_init_subscriptions()

    ko.applyBindings @, document.getElementById element_id

  click_on_actions: (conversation_et, event) ->
    amplify.publish z.event.WebApp.ACTION.SHOW, conversation_et, event

  click_on_connect_requests: ->
    return if @selected_list_item() is z.ViewModel.CONTENT_STATE.PENDING
    @is_self_profile_visible false
    amplify.publish z.event.WebApp.PENDING.SHOW

  click_on_conversation: (conversation_et) =>
    return if @_is_selected_conversation conversation_et
    @is_self_profile_visible false
    amplify.publish z.event.WebApp.CONVERSATION.SHOW, conversation_et

  _init_subscriptions: =>
    amplify.subscribe z.event.WebApp.SEARCH.BADGE.SHOW, => @show_badge true
    amplify.subscribe z.event.WebApp.SEARCH.BADGE.HIDE, => @show_badge false
    amplify.subscribe z.event.WebApp.SHORTCUT.NEXT, @_go_to_next_conversation
    amplify.subscribe z.event.WebApp.SHORTCUT.PREV, @_go_to_prev_conversation
    amplify.subscribe z.event.WebApp.SHORTCUT.START, @click_on_people_button
    amplify.subscribe z.event.WebApp.LOADED, @on_webapp_loaded
    amplify.subscribe z.event.WebApp.CONVERSATION_LIST.SHOW, @_show
    amplify.subscribe z.event.WebApp.ARCHIVE.CLOSE, @_show
    amplify.subscribe z.event.WebApp.ARCHIVE.SHOW, @_hide
    amplify.subscribe z.event.WebApp.SEARCH.SHOW, @_hide

  _go_to_next_conversation: =>
    conversations = @conversation_repository.conversations_unarchived()
    index = conversations.indexOf(@conversation_repository.active_conversation()) - 1
    next_conversation_et = conversations[index]
    amplify.publish z.event.WebApp.CONVERSATION.SHOW, next_conversation_et if next_conversation_et

  _go_to_prev_conversation: =>
    conversations = @conversation_repository.conversations_unarchived()
    index = conversations.indexOf(@conversation_repository.active_conversation()) + 1
    prev_conversation_et = conversations[index]
    amplify.publish z.event.WebApp.CONVERSATION.SHOW, prev_conversation_et if prev_conversation_et

  _is_selected_conversation: (conversation_et) =>
    @selected_list_item() is z.ViewModel.CONTENT_STATE.CONVERSATION and conversation_et.id is @active_conversation_id()

  on_webapp_loaded: =>
    @webapp_is_loaded true


###############################################################################
# Call stuff
###############################################################################

  on_accept_call: (conversation_et) =>
    @call_center.state_handler.join_call conversation_et.id, false

  on_accept_video: (conversation_et) =>
    @call_center.state_handler.join_call conversation_et.id, true

  on_cancel_call: (conversation_et) =>
    @call_center.state_handler.leave_call conversation_et.id

  on_ignore_call: (conversation_et) =>
    @call_center.state_handler.ignore_call conversation_et.id

  on_toggle_audio: (conversation_et) =>
    @call_center.state_handler.toggle_audio conversation_et.id

  on_toggle_screen: (conversation_et) ->
    amplify.publish z.event.WebApp.CALL.STATE.TOGGLE_SCREEN, conversation_et.id

  on_toggle_video: (conversation_et) =>
    @call_center.state_handler.toggle_video conversation_et.id

###############################################################################
# Footer actions
###############################################################################
  click_on_archived_button: ->
    amplify.publish z.event.WebApp.ARCHIVE.SHOW

  click_on_settings_button: =>
    if @is_self_profile_visible()
      amplify.publish z.event.WebApp.PROFILE.HIDE
      @is_self_profile_visible false
    else
      amplify.publish z.event.WebApp.PROFILE.SHOW
      @is_self_profile_visible true

  click_on_people_button: ->
    amplify.publish z.event.WebApp.SEARCH.SHOW

###############################################################################
# Conversation List animations
###############################################################################
  _hide: ->
    $('.conversation-list').addClass 'conversation-list-is-hidden'

  _show: =>
    $('#conversation-list').removeClass('conversation-list-is-hidden')

    @is_conversation_list_visible true
    @is_self_profile_visible false
