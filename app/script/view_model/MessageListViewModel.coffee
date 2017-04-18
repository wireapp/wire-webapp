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

###
Message list rendering view model.

@todo Get rid of the $('.conversation') opacity
@todo Get rid of the participants dependencies whenever bubble implementation has changed
@todo Remove all jquery selectors
###
class z.ViewModel.MessageListViewModel
  constructor: (element_id, @conversation_repository, @user_repository) ->
    @logger = new z.util.Logger 'z.ViewModel.MessageListViewModel', z.config.LOGGER.OPTIONS

    @conversation = ko.observable new z.entity.Conversation()
    @center_messages = ko.pureComputed =>
      return not @conversation().has_further_messages() and @conversation().messages_visible().length is 1 and @conversation().messages_visible()[0]?.is_connection?()

    @conversation_is_changing = false

    # message that should be focused
    @marked_message = ko.observable undefined

    # store last read to show until user switches conversation
    @conversation_last_read_timestamp = ko.observable undefined

    # TODO we should align this with has_further_messages
    @conversation_reached_bottom = false

    # store conversation to mark as read when browser gets focus
    @mark_as_read_on_focus = undefined

    # can we used to prevent scroll handler from being executed (e.g. when using scrollTop())
    @capture_scrolling_event = false

    # store message subscription id
    @messages_subscription = undefined

    # Last open bubble
    @participant_bubble = undefined
    @participant_bubble_last_id = undefined

    @viewport_changed = ko.observable false
    @viewport_changed.extend rateLimit: 100

    @recalculate_timeout = undefined

    # should we scroll to bottom when new message comes in
    @should_scroll_to_bottom = true

    # Check if the message container is to small and then pull new events
    @on_mouse_wheel = _.throttle (e) =>
      is_not_scrollable = not $(e.currentTarget).is_scrollable()
      is_scrolling_up = e.deltaY > 0
      if is_not_scrollable and is_scrolling_up
        @_pull_messages()
    , 200

    @on_scroll = _.throttle (data, e) =>
      return if not @capture_scrolling_event

      @viewport_changed not @viewport_changed()

      element = $ e.currentTarget

      # On some HDPI screen scrollTop returns a floating point number instead of an integer
      # https://github.com/jquery/api.jquery.com/issues/608
      scroll_position = Math.ceil element.scrollTop()
      scroll_end = element.scroll_end()
      scrolled_bottom = false

      if scroll_position is 0
        @_pull_messages()

      if scroll_position >= scroll_end
        scrolled_bottom = true

        if not @conversation_reached_bottom
          @_push_messages()

        @_mark_conversation_as_read_on_focus @conversation()

      @should_scroll_to_bottom = scroll_position > scroll_end - z.config.SCROLL_TO_LAST_MESSAGE_THRESHOLD

      amplify.publish z.event.WebApp.LIST.SCROLL, scrolled_bottom
    , 100

    $(window)
    .on 'resize', =>
      @viewport_changed not @viewport_changed()
    .on 'focus', =>
      if @mark_as_read_on_focus?
        window.setTimeout =>
          @conversation_repository.mark_as_read @mark_as_read_on_focus
          @mark_as_read_on_focus = undefined
        , 1000

    amplify.subscribe z.event.WebApp.CONVERSATION.PEOPLE.HIDE, @hide_bubble
    amplify.subscribe z.event.WebApp.CONTEXT_MENU, @on_context_menu_action
    amplify.subscribe z.event.WebApp.CONVERSATION.INPUT.CLICK, @on_conversation_input_click

  ###
  Mark conversation as read if window has focus
  @param conversation_et [z.entity.Conversation] Conversation entity to mark as read
  ###
  _mark_conversation_as_read_on_focus: (conversation_et) =>
    if document.hasFocus()
      @conversation_repository.mark_as_read conversation_et
    else
      @mark_as_read_on_focus = conversation_et

  ###
  Remove all subscriptions and reset states.
  @param conversation_et [z.entity.Conversation] Conversation entity to change to
  ###
  release_conversation: (conversation_et) =>
    conversation_et?.release()
    @messages_subscription?.dispose()
    @capture_scrolling_event = false
    @conversation_last_read_timestamp false
    @conversation_reached_bottom = false

  ###
  Change conversation.
  @param conversation_et [z.entity.Conversation] Conversation entity to change to
  @param message_et [z.entity.Message] message to be focused
  @param callback [Function] Executed when all events are loaded an conversation is ready to be displayed
  ###
  change_conversation: (conversation_et, message_et, callback) =>
    @conversation_is_changing = true

    # clean up old conversation
    @release_conversation @conversation() if @conversation()

    # update new conversation
    @conversation conversation_et
    @marked_message message_et

    # keep last read timestamp to render unread when entering conversation
    if @conversation().unread_message_count() > 0
      @conversation_last_read_timestamp @conversation().last_read_timestamp()

    if conversation_et.is_loaded() # TODO rethink conversation.is_loaded
      return @_render_conversation conversation_et, callback

    @conversation_repository.update_participating_user_ets conversation_et
    .then (conversation_et) =>
      if @marked_message()
        return @conversation_repository.get_messages_with_offset conversation_et, @marked_message()
      return @conversation_repository.get_preceding_messages conversation_et
    .then =>
      if @conversation().get_last_message()?.timestamp() is @conversation().last_event_timestamp()
        @conversation_reached_bottom = true
      conversation_et.is_loaded true
      @_render_conversation conversation_et, callback

  ###
  Sets the conversation and waits for further processing until knockout has rendered the messages.
  @param conversation_et [z.entity.Conversation] Conversation entity to set
  @param callback [Function] Executed when message list is ready to fade in
  ###
  _render_conversation: (conversation_et, callback) =>
    # hide conversation until everything is processed
    $('.conversation').css opacity: 0

    @conversation_is_changing = false

    messages_container = $('.messages-wrap')
    messages_container.on 'mousewheel', @on_mouse_wheel

    window.setTimeout =>
      is_current_conversation = conversation_et is @conversation()
      if not is_current_conversation
        @logger.info 'Skipped loading conversation', conversation_et.display_name()
        return

      # reset scroll position
      messages_container.scrollTop 0

      @capture_scrolling_event = true

      if not messages_container.is_scrollable()
        @conversation_repository.mark_as_read conversation_et
      else
        unread_message = $ '.message-timestamp-unread'
        if @marked_message()?
          @_focus_message @marked_message()
        else if unread_message.length > 0
          messages_container.scroll_by unread_message.parent().parent().position().top
        else
          messages_container.scroll_to_bottom()

      $('.conversation').css opacity: 1

      # subscribe for incoming messages
      @messages_subscription = conversation_et.messages_visible.subscribe @_on_message_add, null, 'arrayChange'
      callback?()
    , 100

  ###
  Checks how to scroll message list and if conversation should be marked as unread.

  @param message [Array] Array of message entities
  ###
  _on_message_add: (messages) =>
    messages_container = $('.messages-wrap')
    last_item = messages[messages.length - 1]
    last_message = last_item.value

    # we are only interested in items that were added
    if last_item.status isnt 'added'
      return

    # message was prepended
    if last_message?.timestamp() isnt @conversation().last_event_timestamp()
      return

    # scroll to bottom if self user send the message
    if last_message?.from is @user_repository.self().id
      window.requestAnimationFrame -> messages_container.scroll_to_bottom()
      return

    # scroll to the end of the list if we are under a certain threshold
    if @should_scroll_to_bottom
      @conversation_repository.mark_as_read @conversation() if document.hasFocus()
      window.requestAnimationFrame -> messages_container.scroll_to_bottom()

    # mark as read when conversation is not scrollable
    if not messages_container.is_scrollable()
      @_mark_conversation_as_read_on_focus @conversation()

  ###
  Fetch older messages beginning from the oldest message in view
  ###
  _pull_messages: =>
    if not @conversation().is_pending() and @conversation().has_further_messages()
      inner_container = $('.messages-wrap').children()[0]
      old_list_height = inner_container.scrollHeight

      @capture_scrolling_event = false
      @conversation_repository.get_preceding_messages @conversation()
      .then =>
        new_list_height = inner_container.scrollHeight
        $('.messages-wrap').scrollTop new_list_height - old_list_height
        @capture_scrolling_event = true

  ###
  Fetch newer messages beginning from the newest message in view
  ###
  _push_messages: =>
    last_message = @conversation().get_last_message()

    if @conversation_reached_bottom or not last_message?
      return

    @capture_scrolling_event = false
    @conversation_repository.get_subsequent_messages @conversation(), last_message, false
    .then (message_ets) =>
      if message_ets.length is 0
        @conversation_reached_bottom = true
      @capture_scrolling_event = true

  ###
  Scroll to given message in the list. Ideally message is centered horizontally
  @param message_et [z.entity.Message]
  ###
  _focus_message: (message_et) ->
    message_element = $(".message[data-uie-uid=\"#{message_et.id}\"]")
    message_list_element = $('.messages-wrap')
    message_list_element.scroll_by message_element.offset().top - message_list_element.height() / 2

  scroll_height: (change_in_height) ->
    $('.messages-wrap').scroll_by change_in_height

  on_conversation_input_click: =>
    if @conversation_reached_bottom
      $('.messages-wrap').scroll_to_bottom()
    else
      @conversation().remove_messages()
      @conversation_repository.get_preceding_messages @conversation()
      .then ->
        $('.messages-wrap').scroll_to_bottom()

  ###
  Triggered when user clicks on an avatar in the message list.
  @param user_et [z.entity.User] User entity of the selected user
  @param message [DOMElement] Selected DOMElement
  ###
  on_message_user_click: (user_et, element) =>
    BUBBLE_HEIGHT = 440
    MESSAGE_LIST_MIN_HEIGHT = 400
    list_height = $('.message-list').height()
    element_rect = element.getBoundingClientRect()
    element_distance_top = element_rect.top
    element_distance_bottom = list_height - element_rect.top - element_rect.height
    largest_distance = Math.max element_distance_top, element_distance_bottom
    difference = BUBBLE_HEIGHT - largest_distance

    create_bubble = (element_id) =>
      wire.app.view.content.participants.reset_view()
      @participant_bubble_last_id = element_id
      @participant_bubble = new zeta.webapp.module.Bubble
        host_selector: "##{element_id}"
        scroll_selector: '.messages-wrap'
        modal: true
        on_show: ->
          amplify.publish z.event.WebApp.PEOPLE.SHOW, user_et
        on_hide: =>
          @participant_bubble = undefined
          @participant_bubble_last_id = undefined
      @participant_bubble.toggle()

    show_bubble = =>
      wire.app.view.content.participants.confirm_dialog?.destroy()
      # we clicked on the same bubble
      if @participant_bubble and @participant_bubble_last_id is element.id
        @participant_bubble.toggle()
        return

      # dismiss old bubble and wait with creating the new one when another bubble is open
      if @participant_bubble or wire.app.view.content.participants.participants_bubble?.is_visible()
        @participant_bubble?.hide()
        window.setTimeout ->
          create_bubble(element.id)
        , 550
      else
        create_bubble(element.id)

    if difference > 0 and list_height > MESSAGE_LIST_MIN_HEIGHT
      if largest_distance is element_distance_top
        @scroll_by -difference, show_bubble
      else
        @scroll_by difference, show_bubble
    else
      show_bubble()

  ###
  Triggered when user clicks on the session reset link in a decrypt error message.
  @param message_et [z.entity.DecryptErrorMessage] Decrypt error message
  ###
  on_session_reset_click: (message_et) =>
    reset_progress = ->
      window.setTimeout ->
        message_et.is_resetting_session false
        amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.SESSION_RESET
      , 550

    message_et.is_resetting_session true
    @conversation_repository.reset_session message_et.from, message_et.client_id, @conversation().id
    .then -> reset_progress()
    .catch -> reset_progress()

  # Hides participant bubble.
  hide_bubble: =>
    @participant_bubble?.hide()

  ###
  Scrolls whole message list by given distance.

  @note Scrolling is animated with jQuery
  @param distance [Number] Distance by which the container is shifted
  @param callback [Function] Executed when scroll animation is finished
  ###
  scroll_by: (distance, callback) ->
    current_scroll = $('.messages-wrap').scrollTop()
    new_scroll = current_scroll + distance
    $('.messages-wrap').animate {scrollTop: new_scroll}, 300, callback

  ###
  Gets CSS class that will be applied to the message div in order to style.
  @param message [z.entity.Message] Message entity for generating css class
  @return [String] CSS class that is applied to the element
  ###
  get_css_class: (message) ->
    switch message.super_type
      when z.message.SuperType.CALL
        return 'message-system message-call'
      when z.message.SuperType.CONTENT
        return 'message-normal'
      when z.message.SuperType.MEMBER
        return 'message message-system message-member'
      when z.message.SuperType.PING
        return 'message-ping'
      when z.message.SuperType.SYSTEM
        if message.system_message_type is z.message.SystemMessageType.CONVERSATION_RENAME
          return 'message-system message-rename'
      when z.message.SuperType.UNABLE_TO_DECRYPT
        return 'message-system'
      when z.message.SuperType.VERIFICATION
        return 'message-system'

  ###
  Create context menu entries for given message
  @param message_et [z.entity.Message]
  ###
  get_context_menu_entries: (message_et) =>
    entries = []

    @_track_context_menu message_et

    if message_et.is_downloadable() and not message_et.is_ephemeral()
      entries.push {label: z.string.conversation_context_menu_download, action: 'download'}

    if message_et.is_reactable() and not @conversation().removed_from_conversation()
      if message_et.is_liked()
        entries.push {label: z.string.conversation_context_menu_unlike, action: 'react'}
      else
        entries.push {label: z.string.conversation_context_menu_like, action: 'react'}

    if message_et.is_editable() and not @conversation().removed_from_conversation()
      entries.push {label: z.string.conversation_context_menu_edit, action: 'edit'}

    if message_et.is_deletable()
      entries.push {label: z.string.conversation_context_menu_delete, action: 'delete'}

    if message_et.user().is_me and not @conversation().removed_from_conversation() and message_et.status() isnt z.message.StatusType.SENDING
      entries.push {label: z.string.conversation_context_menu_delete_everyone, action: 'delete-everyone'}

    return entries

  ###
  Track context menu click
  @param message_et [z.entity.Message]
  ###
  _track_context_menu: (message_et) =>
    amplify.publish z.event.WebApp.ANALYTICS.EVENT, z.tracking.EventName.CONVERSATION.SELECTED_MESSAGE,
      context: 'single'
      conversation_type: z.tracking.helpers.get_conversation_type @conversation()
      type: z.tracking.helpers.get_message_type message_et

  ###
  Click on context menu entry
  @param tag [String] associated tag
  @param action [String] action that was triggered
  @param data [Object] optional data
  ###
  on_context_menu_action: (tag, action, data) =>
    return if tag isnt 'message'

    message_et = @conversation().get_message_by_id data

    switch action
      when 'delete'
        amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.DELETE_MESSAGE,
          action: => @conversation_repository.delete_message @conversation(), message_et
      when 'delete-everyone'
        amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.DELETE_EVERYONE_MESSAGE,
          action: => @conversation_repository.delete_message_everyone @conversation(), message_et
      when 'download'
        message_et.download()
      when 'edit'
        amplify.publish z.event.WebApp.CONVERSATION.MESSAGE.EDIT, message_et
      when 'react'
        @click_on_like message_et, false

  ###
  Shows detail image view.
  @param message_et [z.entity.Message] Message with asset to be displayed
  @param event [UIEvent] Actual scroll event
  ###
  show_detail: (message_et, event) ->
    return if message_et.is_expired() or $(event.currentTarget).hasClass 'image-loading'
    amplify.publish z.event.WebApp.CONVERSATION.DETAIL_VIEW.SHOW, message_et

  get_timestamp_class: (message_et) ->
    last_message = @conversation().get_previous_message message_et
    return if not last_message?

    if message_et.is_call()
      return ''

    if last_message.timestamp() is @conversation_last_read_timestamp()
      return 'message-timestamp-visible message-timestamp-unread'

    last = moment last_message.timestamp()
    current = moment message_et.timestamp()

    if not last.isSame current, 'day'
      return 'message-timestamp-visible message-timestamp-day'

    if current.diff(last, 'minutes') > 60
      return 'message-timestamp-visible'

  ###
  Checks its older neighbor in order to see if the avatar should be rendered or not
  @param message_et [z.entity.Message]
  ###
  should_hide_user_avatar: (message_et) ->
    last_message = @conversation().get_previous_message message_et

    # TODO avoid double check
    if @get_timestamp_class message_et
      return false

    if message_et.is_content() and message_et.replacing_message_id
      return false

    if last_message?.is_content() and last_message?.user().id is message_et.user().id
      return true

    return false

  ###
  Checks if the given message is the last delivered one
  @param message_et [z.entity.Message]
  ###
  is_last_delivered_message: (message_et) ->
    return @conversation().get_last_delivered_message() is message_et

  click_on_cancel_request: (message_et) =>
    next_conversation_et = @conversation_repository.get_next_conversation @conversation_repository.active_conversation()
    @user_repository.cancel_connection_request message_et.other_user(), next_conversation_et

  click_on_like: (message_et, button = true) =>
    @conversation_repository.toggle_like @conversation(), message_et, button

  ###
  Message appeared in viewport.
  @param message_et [z.entity.Message]
  ###
  message_in_viewport: (message_et) =>
    if not message_et.is_ephemeral()
      return true

    if document.hasFocus()
      @conversation_repository.check_ephemeral_timer message_et
    else
      start_timer_on_focus = @conversation.id

      $(window).one 'focus', =>
        @conversation_repository.check_ephemeral_timer message_et if start_timer_on_focus is @conversation.id

    return true

  # TODO: dev
  on_context_menu_click: (message_et, event) =>
    entries = []

    @_track_context_menu message_et

    if message_et.is_downloadable() and not message_et.is_ephemeral()
      entries.push
        title: z.string.conversation_context_menu_download,
        callback: -> message_et.download()

    if message_et.is_reactable() and not @conversation().removed_from_conversation()
      if message_et.is_liked()
        entries.push title: z.string.conversation_context_menu_unlike, callback: => @click_on_like message_et, false
      else
        entries.push title: z.string.conversation_context_menu_like, callback: => @click_on_like message_et, false

    if message_et.is_editable() and not @conversation().removed_from_conversation()
      entries.push title: z.string.conversation_context_menu_edit, callback: -> amplify.publish z.event.WebApp.CONVERSATION.MESSAGE.EDIT, message_et

    if message_et.is_deletable()
      entries.push title: z.string.conversation_context_menu_delete, callback: =>
        amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.DELETE_MESSAGE,
          action: => @conversation_repository.delete_message @conversation(), message_et

    if message_et.user().is_me and not @conversation().removed_from_conversation() and message_et.status() isnt z.message.StatusType.SENDING
      entries.push title: z.string.conversation_context_menu_delete_everyone, callback: =>
        amplify.publish z.event.WebApp.WARNING.MODAL, z.ViewModel.ModalType.DELETE_EVERYONE_MESSAGE,
          action: => @conversation_repository.delete_message_everyone @conversation(), message_et

    z.ui.Context.from event, entries
