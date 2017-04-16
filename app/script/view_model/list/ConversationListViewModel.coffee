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
z.ViewModel.list ?= {}


class z.ViewModel.list.ConversationListViewModel
  ###
  @param element_id [String] HTML selector
  @param list_view_model [z.ViewModel.list.ListViewModel] List view model
  @param content_view_model [z.ViewModel.ContentViewModel] Content view model
  @param calling_repository [z.calling.CallingRepository] Calling repository
  @param conversation_repository [z.conversation.ConversationRepository] Conversation repository
  @param user_repository [z.user.UserRepository] User repository
  ###
  constructor: (element_id, @list_view_model, @content_view_model, @calling_repository, @conversation_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.list.ConversationListViewModel', z.config.LOGGER.OPTIONS

    @joined_call = @calling_repository.joined_call
    @show_calls = ko.observable false

    @content_state = @content_view_model.content_state
    @selected_conversation = ko.observable()

    @user = @user_repository.self
    @show_badge = ko.observable false

    @connect_requests = @user_repository.connect_requests
    @connect_requests_text = ko.pureComputed =>
      count = @connect_requests().length
      if count > 1
        return z.localization.Localizer.get_text
          id: z.string.conversations_connection_request_many
          replace:
            placeholder: '%no'
            content: count
      return z.localization.Localizer.get_text z.string.conversations_connection_request_one

    @conversations_calls = @conversation_repository.conversations_call
    @conversations_archived = @conversation_repository.conversations_archived
    @conversations_unarchived = @conversation_repository.conversations_unarchived

    @webapp_is_loaded = ko.observable false

    @should_update_scrollbar = (ko.computed =>
      return @webapp_is_loaded() or
          @conversations_unarchived().length or
          @connect_requests().length or
          @conversations_calls().length
    ).extend notify: 'always', rateLimit: 500

    @active_conversation_id = ko.pureComputed =>
      if @conversation_repository.active_conversation()?
        @conversation_repository.active_conversation().id

    @archive_tooltip = ko.pureComputed =>
      return z.localization.Localizer.get_text
        id: z.string.tooltip_conversations_archived
        replace:
          placeholder: '%no'
          content: @conversations_archived().length

    @start_tooltip = z.localization.Localizer.get_text
      id: z.string.tooltip_conversations_tooltip_start
      replace:
        placeholder: '%shortcut'
        content: z.ui.Shortcut.get_shortcut_tooltip z.ui.ShortcutType.START

    @self_stream_state = @calling_repository.self_stream_state

    @show_toggle_screen = ko.pureComputed ->
      return z.calling.CallingRepository.supports_screen_sharing()
    @show_toggle_video = ko.pureComputed =>
      return @joined_call()?.conversation_et.is_one2one()
    @disable_toggle_screen = ko.pureComputed =>
      return @joined_call()?.is_remote_screen_send()

    @_init_subscriptions()

  click_on_connect_requests: ->
    @content_view_model.switch_content z.ViewModel.content.CONTENT_STATE.CONNECTION_REQUESTS

  click_on_conversation: (conversation_et) =>
    return if @is_selected_conversation conversation_et
    @content_view_model.show_conversation conversation_et

  set_show_calls_state: (handling_notifications) =>
    @show_calls handling_notifications is z.event.NOTIFICATION_HANDLING_STATE.WEB_SOCKET
    @logger.info "Set show calls state to: #{@show_calls()}"

  _init_subscriptions: =>
    amplify.subscribe z.event.WebApp.EVENT.NOTIFICATION_HANDLING_STATE, @set_show_calls_state
    amplify.subscribe z.event.WebApp.LIFECYCLE.LOADED, @on_webapp_loaded
    amplify.subscribe z.event.WebApp.SEARCH.BADGE.SHOW, => @show_badge true
    amplify.subscribe z.event.WebApp.SEARCH.BADGE.HIDE, => @show_badge false
    amplify.subscribe z.event.WebApp.SHORTCUT.NEXT, @_go_to_next_conversation
    amplify.subscribe z.event.WebApp.SHORTCUT.PREV, @_go_to_prev_conversation
    amplify.subscribe z.event.WebApp.SHORTCUT.START, @click_on_people_button

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

  is_selected_conversation: (conversation_et) =>
    is_selected_conversation = conversation_et.id is @active_conversation_id()
    is_selected_state = @content_state() in [
      z.ViewModel.content.CONTENT_STATE.COLLECTION
      z.ViewModel.content.CONTENT_STATE.COLLECTION_DETAILS
      z.ViewModel.content.CONTENT_STATE.CONVERSATION
    ]
    return is_selected_conversation and is_selected_state

  on_webapp_loaded: =>
    @webapp_is_loaded true


  ###############################################################################
  # Call stuff
  ###############################################################################

  on_accept_call: (conversation_et) ->
    amplify.publish z.event.WebApp.CALL.STATE.JOIN, conversation_et.id, false

  on_accept_video: (conversation_et) ->
    amplify.publish z.event.WebApp.CALL.STATE.JOIN, conversation_et.id, true

  on_leave_call: (conversation_et) =>
    termination_reason = z.calling.enum.TERMINATION_REASON.SELF_USER if @joined_call()?.state() isnt z.calling.enum.CallState.OUTGOING
    amplify.publish z.event.WebApp.CALL.STATE.LEAVE, conversation_et.id, termination_reason

  on_reject_call: (conversation_et) ->
    amplify.publish z.event.WebApp.CALL.STATE.REJECT, conversation_et.id

  on_toggle_audio: (conversation_et) ->
    amplify.publish z.event.WebApp.CALL.MEDIA.TOGGLE, conversation_et.id, z.media.MediaType.AUDIO

  on_toggle_screen: (conversation_et) ->
    amplify.publish z.event.WebApp.CALL.MEDIA.CHOOSE_SCREEN, conversation_et.id

  on_toggle_video: (conversation_et) ->
    amplify.publish z.event.WebApp.CALL.MEDIA.TOGGLE, conversation_et.id, z.media.MediaType.VIDEO


  ###############################################################################
  # Footer actions
  ###############################################################################

  click_on_archived_button: =>
    @list_view_model.switch_list z.ViewModel.list.LIST_STATE.ARCHIVE

  click_on_preferences_button: =>
    @list_view_model.switch_list z.ViewModel.list.LIST_STATE.PREFERENCES

  click_on_people_button: =>
    @list_view_model.switch_list z.ViewModel.list.LIST_STATE.START_UI

  ###############################################################################
  # Context menu
  ###############################################################################

  on_context_menu: (conversation_et, event) =>
    entries = []

    if not conversation_et.is_request() and not conversation_et.removed_from_conversation()
      title = if conversation_et.is_muted() then z.string.conversations_popover_notify else z.string.conversations_popover_silence
      entries.push
        title: z.localization.Localizer.get_text(title),
        callback: => @conversation_repository.toggle_silence_conversation conversation_et

    if conversation_et.is_archived()
      entries.push
        title: z.localization.Localizer.get_text(z.string.conversations_popover_unarchive),
        callback: => @click_on_unarchive_action conversation_et
    else
      entries.push
        title: z.localization.Localizer.get_text(z.string.conversations_popover_archive),
        callback: => @click_on_archive_action conversation_et

    if conversation_et.is_request()
      entries.push
        title: z.localization.Localizer.get_text(z.string.conversations_popover_cancel),
        callback: => @click_on_cancel_action conversation_et

    if not conversation_et.is_request() and not conversation_et.is_cleared()
      entries.push
        title: z.localization.Localizer.get_text(z.string.conversations_popover_clear),
        callback: => @click_on_clear_action conversation_et

    if not conversation_et.is_group()
      entries.push
        title: z.localization.Localizer.get_text(z.string.conversations_popover_block),
        callback: => @click_on_block_action conversation_et

    if conversation_et.is_group() and not conversation_et.removed_from_conversation()
      entries.push
        title: z.localization.Localizer.get_text(z.string.conversations_popover_leave),
        callback: => @click_on_leave_action conversation_et

    z.ui.Context.from event, entries

  click_on_block_action: (conversation_et) =>
    next_conversation_et = @conversation_repository.get_next_conversation conversation_et
    user_et = conversation_et.participating_user_ets()[0]
    amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.BLOCK,
      data: user_et.first_name()
      action: => @user_repository.block_user user_et, ->
        amplify.publish z.event.WebApp.CONVERSATION.SWITCH, conversation_et, next_conversation_et

  click_on_cancel_action: (conversation_et) =>
    next_conversation_et = @conversation_repository.get_next_conversation conversation_et
    @user_repository.cancel_connection_request conversation_et.participating_user_ets()[0], next_conversation_et

  click_on_clear_action: (conversation_et) =>
    amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.CLEAR,
      data: conversation_et.display_name()
      conversation: conversation_et
      action: (leave = false) => @conversation_repository.clear_conversation conversation_et, leave

  click_on_leave_action: (conversation_et) =>
    next_conversation_et = @conversation_repository.get_next_conversation conversation_et
    amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.LEAVE,
      data: conversation_et.display_name()
      action: => @conversation_repository.leave_conversation conversation_et, next_conversation_et

  click_on_unarchive_action: (conversation_et) =>
    @conversation_repository.unarchive_conversation conversation_et
    .then =>
      if not @conversation_repository.conversations_archived().length
        @list_view_model.switch_list z.ViewModel.list.LIST_STATE.CONVERSATIONS
